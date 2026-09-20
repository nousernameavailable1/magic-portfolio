"use client";

import styles from "@/app/not-found.module.scss";
import { Text } from "@once-ui-system/core";
import { useEffect, useState } from "react";

const fallback = "The page you are looking for does not exist.";

export function EditableNotFoundDescription() {
  const [description, setDescription] = useState(fallback);

  useEffect(() => {
    fetch("/api/site-text", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { value?: unknown } | null) => {
        if (typeof data?.value === "string" && data.value.trim()) setDescription(data.value);
      })
      .catch(() => undefined);
  }, []);

  return (
    <Text className={styles.description} align="center" onBackground="neutral-weak">
      {description}
    </Text>
  );
}
