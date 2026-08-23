"use client";

import { useEffect } from "react";

export function VisitorTracker() {
  useEffect(() => {
    void fetch("/api/visits", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    });
  }, []);

  return null;
}
