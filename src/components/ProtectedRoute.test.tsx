import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import type { UserRole } from "@/lib/types";

const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderRoute(requiredRole: UserRole[]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route element={<ProtectedRoute requiredRole={requiredRole} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/setup-profile" element={<div>Setup Profile</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows loading spinner when loading", () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true });
    renderRoute(["buyer"]);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects to /login when not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });
    renderRoute(["buyer"]);
    expect(screen.getByText("Login Page")).toBeTruthy();
  });

  it("redirects to /setup-profile when profile incomplete", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      profile: { discord_username: null, role: "buyer" },
      loading: false,
    });
    renderRoute(["buyer"]);
    expect(screen.getByText("Setup Profile")).toBeTruthy();
  });

  it("redirects to / when role not authorized", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      profile: { discord_username: "test", role: "buyer" },
      loading: false,
    });
    renderRoute(["admin"]);
    expect(screen.getByText("Home Page")).toBeTruthy();
  });

  it("renders children when role is authorized", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      profile: { discord_username: "test", role: "seller" },
      loading: false,
    });
    renderRoute(["seller", "admin"]);
    expect(screen.getByText("Protected Content")).toBeTruthy();
  });

  it("shows disabled message when user is disabled", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      profile: { discord_username: "test", role: "buyer", disabled: true },
      loading: false,
    });
    renderRoute(["buyer"]);
    expect(screen.getByText("Account Disabled")).toBeTruthy();
  });

  it("allows admin to access seller routes", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      profile: { discord_username: "test", role: "admin" },
      loading: false,
    });
    renderRoute(["seller", "admin"]);
    expect(screen.getByText("Protected Content")).toBeTruthy();
  });

  it("does not redirect when profile has discord_username", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      profile: { discord_username: "valid_user", role: "buyer" },
      loading: false,
    });
    renderRoute(["buyer"]);
    expect(screen.getByText("Protected Content")).toBeTruthy();
  });
});
