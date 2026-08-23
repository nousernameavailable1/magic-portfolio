import { person, social } from "@/resources";
import { IconButton, Row, SmartLink, Text } from "@once-ui-system/core";
import { FaChartColumn } from "react-icons/fa6";
import styles from "./Footer.module.scss";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Row as="footer" fillWidth padding="8" horizontal="center" s={{ direction: "column" }}>
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
        <Row className={styles.footerStart} gap="8" vertical="center">
          <a
            className={styles.statsLink}
            href="/statistics"
            aria-label="View site statistics"
            title="Statistics"
          >
            <FaChartColumn aria-hidden="true" />
          </a>
          <Text aria-hidden="true" onBackground="neutral-weak">
            |
          </Text>
          <Text variant="body-default-s" onBackground="neutral-strong">
            <Text onBackground="neutral-weak">© {currentYear} /</Text>
            <Text
              as="a"
              href="/admin/login"
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
        <Row gap="16">
          {social.map(
            (item) =>
              item.link &&
              !["LinkedIn", "Instagram", "Threads"].includes(item.name) && (
                <IconButton
                  key={item.name}
                  href={item.link}
                  icon={item.icon}
                  tooltip={item.name}
                  size="s"
                  variant="ghost"
                />
              ),
          )}
        </Row>
      </Row>
      <Row height="80" hide s={{ hide: false }} />
    </Row>
  );
};
