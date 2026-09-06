import { readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const galleryDirectory = path.join(process.cwd(), "public", "images", "gallery");
const maximumEdge = 3200;
const avifOptions = {
  quality: 80,
  effort: 6,
  chromaSubsampling: "4:2:0",
  bitdepth: 10,
  tune: "ssim",
};

const files = (await readdir(galleryDirectory))
  .filter((filename) => /^img_.*\.avif$/i.test(filename))
  .sort();

let originalBytes = 0;
let optimizedBytes = 0;
let optimizedCount = 0;

for (const filename of files) {
  const sourcePath = path.join(galleryDirectory, filename);
  const temporaryPath = path.join(galleryDirectory, `.${filename}.optimized.avif`);
  const backupPath = path.join(galleryDirectory, `.${filename}.backup.avif`);
  const metadata = await sharp(sourcePath).metadata();
  const sourceSize = (await stat(sourcePath)).size;
  const sourceWidth = metadata.autoOrient.width;
  const sourceHeight = metadata.autoOrient.height;

  originalBytes += sourceSize;

  if (typeof sourceWidth !== "number" || typeof sourceHeight !== "number") {
    throw new Error(`Could not read dimensions for ${filename}`);
  }

  if (Math.max(sourceWidth, sourceHeight) <= maximumEdge) {
    optimizedBytes += sourceSize;
    console.log(`Skipped ${filename}; already at or below ${maximumEdge}px.`);
    continue;
  }

  await rm(temporaryPath, { force: true });
  await rm(backupPath, { force: true });

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: maximumEdge,
      height: maximumEdge,
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    })
    .keepIccProfile()
    .avif(avifOptions)
    .toFile(temporaryPath);

  const outputMetadata = await sharp(temporaryPath).metadata();
  const outputSize = (await stat(temporaryPath)).size;
  const sourceRatio = sourceWidth / sourceHeight;
  const outputRatio = outputMetadata.width / outputMetadata.height;

  if (
    Math.max(outputMetadata.width, outputMetadata.height) !== maximumEdge ||
    Math.abs(sourceRatio - outputRatio) > 0.001
  ) {
    await rm(temporaryPath, { force: true });
    throw new Error(`Dimension verification failed for ${filename}`);
  }

  await rename(sourcePath, backupPath);
  try {
    await rename(temporaryPath, sourcePath);
    await rm(backupPath);
  } catch (error) {
    await rm(sourcePath, { force: true });
    await rename(backupPath, sourcePath);
    throw error;
  }

  optimizedBytes += outputSize;
  optimizedCount += 1;
  console.log(
    `Optimized ${filename}: ${sourceWidth}x${sourceHeight} -> ${outputMetadata.width}x${outputMetadata.height}, ` +
      `${formatMiB(sourceSize)} -> ${formatMiB(outputSize)}`,
  );
}

console.log(
  `Finished: ${optimizedCount} image(s) optimized, ${formatMiB(originalBytes)} -> ${formatMiB(optimizedBytes)}.`,
);

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
