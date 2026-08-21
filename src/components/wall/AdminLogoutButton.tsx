"use client";

import { Button, IconButton } from "@once-ui-system/core";

export function AdminLogoutButton({ compact = false }: { compact?: boolean }) {
  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.assign("/admin/login");
  };

  if (compact) {
    return (
      <IconButton
        aria-label="Sign out"
        icon="enter"
        tooltip="Sign out"
        variant="secondary"
        onClick={() => void logout()}
      />
    );
  }

  return (
    <Button variant="secondary" onClick={() => void logout()}>
      Sign out
    </Button>
  );
}
