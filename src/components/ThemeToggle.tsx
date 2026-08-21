"use client";

import { ToggleButton, useTheme } from "@once-ui-system/core";
import type React from "react";
import { useEffect, useState } from "react";

export const ThemeToggle: React.FC = () => {
  const { setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState("light");

  useEffect(() => {
    setCurrentTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  const icon = currentTheme === "dark" ? "light" : "dark";
  const nextTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={icon}
      onClick={() => {
        setTheme(nextTheme);
        setCurrentTheme(nextTheme);
      }}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
};
