import { useEffect, useState } from "react";

const KEY = "plant-card-theme";

// Светлая/тёмная тема: класс .dark на <html>, выбор помнится в браузере.
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEY) || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch { /* приватный режим — просто не запоминаем */ }
  }, [theme]);

  return { theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) };
}
