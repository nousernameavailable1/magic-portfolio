import { AdminLoginForm } from "@/components/wall/AdminLoginForm";
import { Column, Heading, Text } from "@once-ui-system/core";
import Link from "next/link";
import styles from "./login.module.scss";

export const metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <Column
      className={styles.page}
      maxWidth="xs"
      fillWidth
      gap="20"
      paddingY="48"
      horizontal="center"
      align="center"
    >
      <Link className={styles.backLink} href="/">
        <span aria-hidden="true">←</span>
        Back to site
      </Link>
      <Column className={styles.intro} gap="8" horizontal="center" align="center">
        <Text aria-hidden="true" className={styles.mobileEyebrow} variant="label-strong-s">
          CONTROL ROOM
        </Text>
        <Heading className={styles.title} as="h1" align="center" variant="display-strong-l">
          Admin
        </Heading>
        <Text className={styles.description} align="center" onBackground="neutral-weak">
          Nothing to see here...
        </Text>
      </Column>
      <AdminLoginForm />
    </Column>
  );
}
