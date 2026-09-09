import { about, person, social } from "@/resources";
import { Icon } from "@once-ui-system/core";
import { HiArrowUpRight } from "react-icons/hi2";
import styles from "./DesktopAbout.module.scss";
import ProfileCard from "./ProfileCard";

export default function DesktopAboutHero({ introduction }: { introduction: string }) {
  return (
    <section id="about-overview" className={styles.hero} aria-labelledby="desktop-about-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />A little more about me
        </p>
        <h1 id="desktop-about-title" className={styles.title}>
          {person.firstName}
          <br />
          <span>{person.lastName}.</span>
        </h1>
        <p className={styles.role}>{person.role}</p>
        {about.intro.display && <p className={styles.description}>{introduction}</p>}
        <div className={styles.socials}>
          {social
            .filter((item) => item.essential && item.link)
            .map((item) => (
              <a key={item.name} href={item.link}>
                <Icon name={item.icon} size="s" />
                {item.name}
                <HiArrowUpRight aria-hidden="true" />
              </a>
            ))}
        </div>
      </div>
      {about.avatar.display && (
        <ProfileCard
          name={person.name}
          avatar={person.avatar}
          location={person.location}
          languages={person.languages ?? []}
        />
      )}
    </section>
  );
}
