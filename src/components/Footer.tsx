"use client";

import { person, social } from "@/resources";
import { IconButton, Row, SmartLink, Text } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { FaChartColumn } from "react-icons/fa6";
import styles from "./Footer.module.scss";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname() ?? "";
  const visibleSocial = social.filter(
    (item) => item.link && !["LinkedIn", "Instagram", "Threads"].includes(item.name),
  );

  return (
    <Row
      as="footer"
      className={`${styles.footer} ${pathname.startsWith("/admin") ? styles.adminFooter : ""}`}
      fillWidth
      padding="8"
      horizontal="center"
      s={{ direction: "column" }}
    >
      <Row
        className={styles.mobile}
        maxWidth="m"
        paddingY="8"
        paddingX="16"
        gap="16"
        horizontal="between"
        vertical="center"
        s={{
          direction: "column",
          horizontal: "center",
          align: "center",
        }}
      >
        <Row className={styles.mobileActions} gap="8" horizontal="center" vertical="center">
          <a
            className={styles.mobileActionLink}
            href="/statistics"
            aria-label="View site statistics"
          >
            <FaChartColumn aria-hidden="true" />
          </a>
          {visibleSocial.map((item) => (
            <IconButton
              className={styles.mobileSocialButton}
              key={`mobile-${item.name}`}
              href={item.link}
              icon={item.icon}
              tooltip={item.name}
              size="s"
              variant="ghost"
            />
          ))}
        </Row>
        <Row className={styles.footerStart} gap="8" vertical="center">
          <a
            className={styles.statsLink}
            href="/statistics"
            aria-label="View site statistics"
            title="Statistics"
          >
            <FaChartColumn aria-hidden="true" />
          </a>
          <Text className={styles.divider} aria-hidden="true" onBackground="neutral-weak">
            |
          </Text>
          <Text
            className={styles.footerCopy}
            variant="body-default-s"
            onBackground="neutral-strong"
          >
            <Text onBackground="neutral-weak">© {currentYear} /</Text>
            <Text
              as="a"
              href="/admin/dashboard"
              paddingX="4"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {person.name}
            </Text>
            <Text onBackground="neutral-weak">
              {/* Usage of this template requires attribution. Please don't remove the link to Once UI unless you have a Pro license. */}
              / Build your portfolio with{" "}
              <SmartLink href="https://once-ui.com/products/magic-portfolio">Once UI</SmartLink>
            </Text>
          </Text>
        </Row>
        <Row className={styles.desktopSocial} gap="16">
          {visibleSocial.map((item) => (
            <IconButton
              key={item.name}
              href={item.link}
              icon={item.icon}
              tooltip={item.name}
              size="s"
              variant="ghost"
            />
          ))}
        </Row>
      </Row>
      <Row className={styles.mobileSpacer} height="80" hide s={{ hide: false }} />
    </Row>
  );
};
