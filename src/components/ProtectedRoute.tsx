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

  if (profile && !requiredRole.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
