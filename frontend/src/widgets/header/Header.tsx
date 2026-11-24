import { useEffect } from "react";
import { NavLink, useLocation, type NavLinkRenderProps } from "react-router";
import { loadProfileThunk } from "../../entities/profile";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { Logo } from "../../shared/ui";

const navLinkClass = ({ isActive }: NavLinkRenderProps) =>
    isActive
        ? "text-link underline underline-offset-4"
        : "text-ink-muted hover:text-ink";

export const Header = () => {
    const dispatch = useAppDispatch();
    const { pathname } = useLocation();
    const user = useAppSelector((state) => state.auth.user);
    const profile = useAppSelector((state) => state.profile.profile);
    const loadStatus = useAppSelector(
        (state) => state.profile.requests.load.status,
    );

    useEffect(() => {
        if (user && pathname !== "/profile" && loadStatus === "idle") {
            void dispatch(loadProfileThunk());
        }
    }, [dispatch, user, pathname, loadStatus]);

    return (
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <Logo />
            {user ? (
                <NavLink
                    to="/profile"
                    className="flex min-w-0 items-center gap-3 rounded-control font-semibold"
                >
                    <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                        </svg>
                    </span>
                    <span className="max-w-40 truncate phone:max-w-64">
                        {profile?.displayName || user.email}
                    </span>
                </NavLink>
            ) : (
                <nav
                    aria-label="Авторизация"
                    className="flex items-center gap-4"
                >
                    <NavLink to="/login" className={navLinkClass}>
                        Вход
                    </NavLink>
                    <NavLink to="/register" className={navLinkClass}>
                        Регистрация
                    </NavLink>
                </nav>
            )}
        </header>
    );
};
