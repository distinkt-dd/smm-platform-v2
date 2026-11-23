import { Navigate, Outlet, useLocation } from "react-router";

type Props = {
    authenticated: boolean;
    loading: boolean;
    unavailable: boolean;
    retry: () => void;
};

export function ProtectedRoute({
    authenticated,
    loading,
    unavailable,
    retry,
}: Props) {
    const location = useLocation();
    if (loading) return <p role="status">Проверяем сессию…</p>;
    if (unavailable)
        return (
            <div role="alert">
                <p>Не удалось проверить сессию.</p>
                <button type="button" onClick={retry}>
                    Повторить
                </button>
            </div>
        );
    return authenticated ? (
        <Outlet />
    ) : (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
}
