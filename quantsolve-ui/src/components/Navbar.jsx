import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const navItems = [
    { to: "/", label: "Home" },
    { to: "/solver", label: "Solver" },
    { to: "/how-it-works", label: "How It Works" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] backdrop-blur-lg">
            <div className="container-pro py-3">
                <div className="flex items-center justify-between gap-3">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[linear-gradient(140deg,var(--primary),var(--accent))] text-white grid place-items-center font-extrabold">
                            QX
                        </div>
                        <div>
                            <div className="font-bold text-[1.03rem]">
                                QuantSolve
                            </div>
                            <div className="text-xs muted">
                                Equation Intelligence Suite
                            </div>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `top-link ${isActive ? "active" : ""}`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            type="button"
                            className="btn btn-ghost md:hidden"
                            onClick={() => setOpen((v) => !v)}
                            aria-label="Toggle menu"
                        >
                            Menu
                        </button>
                    </div>
                </div>

                {open && (
                    <div className="md:hidden mt-2 panel p-2">
                        <div className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setOpen(false)}
                                    className={({ isActive }) =>
                                        `top-link ${isActive ? "active" : ""}`
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
