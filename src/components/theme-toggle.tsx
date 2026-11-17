"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = nextTheme;
    root.classList.toggle("dark", nextTheme === "dark");

    try {
      window.localStorage.setItem("educhi-theme", nextTheme);
    } catch {
      // The current page still changes theme when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Chuyển đổi giao diện sáng và tối"
      title="Chuyển đổi giao diện sáng và tối"
    >
      <Sun className="theme-toggle-sun" aria-hidden="true" />
      <Moon className="theme-toggle-moon" aria-hidden="true" />
      <span className="sr-only">Chuyển đổi giao diện sáng và tối</span>
    </button>
  );
}
