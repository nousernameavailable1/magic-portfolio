"use client";

import { ToggleButton, useTheme } from "@once-ui-system/core";
import type React from "react";

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const icon = resolvedTheme === "dark" ? "light" : "dark";
  const nextTheme = resolvedTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={icon}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
};
