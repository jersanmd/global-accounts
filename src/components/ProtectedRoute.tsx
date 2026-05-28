import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";

interface Props {
  requiredRole: UserRole[];
}

export function ProtectedRoute({ requiredRole }: Props) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if profile hasn't been set up
  if (profile && !profile.discord_username) {
    return <Navigate to="/setup-profile" replace />;
  }

  if (profile && !requiredRole.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  // Block disabled users
  if (profile?.disabled) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">Account Disabled</p>
          <p className="mt-2 text-sm text-gray-500">Your account has been disabled. Contact support for assistance.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
