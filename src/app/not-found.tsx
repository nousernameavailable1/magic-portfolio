import { Button, Column, Heading, Text } from "@once-ui-system/core";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <Column className={styles.page} as="section" fill center paddingBottom="160">
      <Text className={styles.code} marginBottom="s" variant="display-strong-xl">
        404
      </Text>
      <Heading className={styles.title} marginBottom="l" variant="display-default-xs">
        Page Not Found
      </Heading>
      <Text className={styles.description} align="center" onBackground="neutral-weak">
        The page you are looking for does not exist.
      </Text>
      <Button
        className={styles.mobileAction}
        href="/"
        prefixIcon="home"
        size="l"
        variant="secondary"
      >
        Back home
      </Button>
    </Column>
  );
}
