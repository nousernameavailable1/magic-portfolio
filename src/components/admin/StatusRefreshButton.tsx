"use client";

import { Button } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function StatusRefreshButton() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  return (
    <Button
      size="s"
      variant="secondary"
      loading={refreshing}
      onClick={() => startTransition(() => router.refresh())}
    >
      Refresh
    </Button>
  );
}
