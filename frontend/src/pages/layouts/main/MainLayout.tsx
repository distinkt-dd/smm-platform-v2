import { Outlet } from "react-router";
import { Header } from "../../../widgets/header";
import { Navigation } from "../../../widgets/navigation/Navigation";
import { useAppSelector } from "../../../shared/store";

export const MainLayout = () => {
    const user = useAppSelector((state) => state.auth.user);
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex flex-1">
                {user && <Navigation />}
                <main
                    className={`relative flex min-w-0 flex-1 flex-col px-6 py-10 ${user ? "pb-24 phone:pb-10" : ""}`}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
