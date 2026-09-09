"use client";

import { ToggleButton, useTheme } from "@once-ui-system/core";
import { useEffect, useState } from "react";
import type React from "react";

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Stored/system preferences are only known in the browser. Keep the initial
  // icon and label identical to the server, then show the resolved preference.
  const currentTheme = mounted ? resolvedTheme : "dark";
  const icon = currentTheme === "dark" ? "light" : "dark";
  const nextTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={icon}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
};
