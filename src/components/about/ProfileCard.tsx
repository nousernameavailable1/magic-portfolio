"use client";

import { Avatar } from "@once-ui-system/core";
import { useState } from "react";
import { HiArrowPath, HiArrowUturnLeft, HiOutlineCube } from "react-icons/hi2";
import styles from "./DesktopAbout.module.scss";

const quests = [
  "Find one thing you don’t understand. Go down the rabbit hole.",
  "Open an old project. Give one small detail a little more love.",
  "Learn a keyboard shortcut. Use it three times today.",
  "Take a photo of something you normally walk straight past.",
  "Make something tiny, just because you can.",
];

export default function ProfileCard({
  name,
  avatar,
  location,
  languages,
}: { name: string; avatar: string; location: string; languages: string[] }) {
  const [flipped, setFlipped] = useState(false);
  const [quest, setQuest] = useState(0);

  return (
    <div className={styles.profileCard}>
      <div className={styles.cardHeader}>
        <span className={styles.eyebrow}>{flipped ? "A small detour" : "Behind the screen"}</span>
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
            <Avatar src={avatar} size="xl" />
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
          <HiOutlineCube className={styles.questIcon} aria-hidden="true" />
          <p className={styles.eyebrow}>A tiny side quest</p>
          <p className={styles.questText} aria-live="polite" aria-atomic="true">
            <span key={quest}>{quests[quest]}</span>
          </p>
          <button
            type="button"
            className={styles.shuffleButton}
            onClick={() =>
              setQuest(
                (current) =>
                  (current + 1 + Math.floor(Math.random() * (quests.length - 1))) % quests.length,
              )
            }
          >
            <HiArrowPath aria-hidden="true" />
            Another idea
          </button>
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
