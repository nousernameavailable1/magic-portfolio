"use client";

import { Avatar } from "@once-ui-system/core";
import { useState } from "react";
import { HiArrowUturnLeft, HiOutlineSignal } from "react-icons/hi2";
import styles from "./DesktopAbout.module.scss";

export default function ProfileCard({
  name,
  avatar,
  location,
  languages,
  currentlyDoing,
}: {
  name: string;
  avatar: string;
  location: string;
  languages: string[];
  currentlyDoing: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={styles.profileCard}>
      <div className={styles.cardHeader}>
        <span className={styles.eyebrow}>{flipped ? "Current status" : "Behind the screen"}</span>
        <button
          type="button"
          className={styles.flipButton}
          aria-label="Flip profile card"
          aria-pressed={flipped}
          onClick={() => setFlipped(!flipped)}
        >
          {flipped ? "Back" : "Flip card"}
          <HiArrowUturnLeft aria-hidden="true" />
        </button>
      </div>
      <div className={styles.cardStage} data-flipped={flipped}>
        <div className={styles.cardFace} aria-hidden={flipped} inert={flipped}>
          <div className={styles.portrait}>
            <span className={styles.portraitRing} aria-hidden="true" />
            <Avatar src={avatar} size="xl" unoptimized />
            <span className={styles.portraitCaption}>{name}</span>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Based in</dt>
              <dd>{location.split("/").pop()?.replaceAll("_", " ") ?? location}</dd>
            </div>
            {languages.length > 0 && (
              <div>
                <dt>Speaks</dt>
                <dd>{languages.join(" · ")}</dd>
              </div>
            )}
          </dl>
        </div>
        <div
          className={`${styles.cardFace} ${styles.cardBack}`}
          aria-hidden={!flipped}
          inert={!flipped}
        >
          <HiOutlineSignal className={styles.statusIcon} aria-hidden="true" />
          <p className={styles.eyebrow}>Right now</p>
          <p className={styles.statusText}>{currentlyDoing}</p>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span>{location}</span>
        <span className={styles.cardSignature} aria-hidden="true">
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")}
          .
        </span>
      </div>
    </div>
  );
}
