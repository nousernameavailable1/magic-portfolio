"use client";

import { gallery } from "@/resources";
import { MasonryGrid, Media } from "@once-ui-system/core";
import styles from "./gallery.module.scss";

export default function GalleryView() {
  return (
    <MasonryGrid className={styles.grid} columns={2} s={{ columns: 2 }}>
      {gallery.images.map((image, index) => (
        <Media
          className={styles.image}
          enlarge
          priority={index === 0}
          unoptimized
          sizes="(max-width: 560px) 100vw, 50vw"
          key={image.src}
          radius="m"
          aspectRatio={`${image.width} / ${image.height}`}
          src={image.src}
          alt={image.alt}
        />
      ))}
    </MasonryGrid>
  );
}
