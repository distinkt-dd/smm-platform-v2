import { NavLink } from "react-router";

const items = [
    {
        to: "/",
        label: "Главная",
        icon: (
            <>
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" />
            </>
        ),
    },
    {
        to: "/profile",
        label: "Профиль",
        icon: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </>
        ),
    },
];

export function Navigation() {
    return (
        <nav
            aria-label="Основная навигация"
            className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface px-4 pb-[env(safe-area-inset-bottom)] phone:static phone:w-nav phone:shrink-0 phone:flex-col phone:border-t-0 phone:border-r phone:px-3 phone:py-6"
        >
            {items.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) =>
                        `flex min-h-14 flex-1 items-center justify-center gap-3 rounded-control px-4 font-semibold phone:flex-none phone:justify-start ${isActive ? "bg-surface-muted text-ink" : "text-ink-muted hover:text-ink"}`
                    }
                >
                    <svg
                        aria-hidden="true"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {item.icon}
                    </svg>
                    {item.label}
                </NavLink>
            ))}
        </nav>
    );
}
