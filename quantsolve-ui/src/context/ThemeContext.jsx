import { createContext, useEffect, useMemo, useState } from "react";

export const ThemeContext = createContext(null);

export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(
        () => localStorage.getItem("theme") || "light",
    );

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
    }, [theme]);

    const value = useMemo(
        () => ({
            theme,
            toggleTheme: () =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark")),
            setTheme,
        }),
        [theme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}
