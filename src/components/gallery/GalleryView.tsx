"use client";

import { gallery } from "@/resources";
import { MasonryGrid, Media } from "@once-ui-system/core";
import { useState } from "react";
import { HiArrowUpRight, HiOutlineSquares2X2, HiOutlineViewColumns } from "react-icons/hi2";
import styles from "./gallery.module.scss";

export default function GalleryView() {
  const [layout, setLayout] = useState("editorial");
  return (
    <div className={styles.collection} data-layout={layout}>
      <div className={styles.toolbar}>
        <div className={styles.collectionInfo}>
          <span>{String(gallery.images.length).padStart(2, "0")} photographs</span>
          <span>Click a frame to explore</span>
        </div>
        <fieldset className={styles.viewControls} aria-label="Gallery layout">
          <button
            type="button"
            aria-pressed={layout === "editorial"}
            onClick={() => setLayout("editorial")}
          >
            <HiOutlineViewColumns aria-hidden="true" /> Editorial
          </button>
          <button
            type="button"
            aria-pressed={layout === "contact"}
            onClick={() => setLayout("contact")}
          >
            <HiOutlineSquares2X2 aria-hidden="true" /> Contact sheet
          </button>
        </fieldset>
      </div>
      <MasonryGrid className={styles.grid} columns={2} s={{ columns: 2 }}>
        {gallery.images.map((image, index) => (
          <div className={styles.frame} key={image.src}>
            <Media
              className={styles.image}
              enlarge
              priority={index === 0}
              unoptimized
              radius="m"
              aspectRatio={`${image.width} / ${image.height}`}
              src={image.src}
              alt={image.alt}
            />
            <div className={styles.caption}>
              <span className={styles.frameNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span>{image.alt}</span>
              <HiArrowUpRight aria-hidden="true" />
            </div>
          </div>
        ))}
      </MasonryGrid>
    </div>
  );
}
