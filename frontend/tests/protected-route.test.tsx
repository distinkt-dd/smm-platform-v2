// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../src/shared/ui/protected-route/ProtectedRoute";

afterEach(cleanup);

function show(authenticated: boolean, loading: boolean, unavailable = false) {
    render(<MemoryRouter initialEntries={["/"]}><Routes>
        <Route element={<ProtectedRoute authenticated={authenticated} loading={loading} unavailable={unavailable} retry={vi.fn()} />}>
            <Route path="/" element={<p>private</p>} />
        </Route>
        <Route path="/login" element={<p>login</p>} />
    </Routes></MemoryRouter>);
}

it("waits for session restoration before redirecting", () => { show(false, true); expect(screen.getByRole("status")).toBeTruthy(); expect(screen.queryByText("login")).toBeNull(); });
it("redirects guests to login", () => { show(false, false); expect(screen.getByText("login")).toBeTruthy(); });
it("renders protected content for a user", () => { show(true, false); expect(screen.getByText("private")).toBeTruthy(); });
it("shows a retry state if session verification fails", () => { show(false, false, true); expect(screen.getByRole("alert")).toBeTruthy(); expect(screen.queryByText("login")).toBeNull(); });
