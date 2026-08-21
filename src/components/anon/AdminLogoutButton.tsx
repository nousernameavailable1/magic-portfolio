"use client";

import { Button } from "@once-ui-system/core";

export function AdminLogoutButton() {
  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.assign("/admin/login");
  };

  return <Button variant="secondary" onClick={() => void logout()}>Sign out</Button>;
}
