import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            type="button"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? "Light" : "Dark"}
        </button>
    );
}
