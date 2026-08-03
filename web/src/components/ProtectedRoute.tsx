import {
  Navigate,
  Outlet,
} from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { getRouteAccessDecision } from "../security/routeAccess";
import type { UserRole } from "../types/session";

type ProtectedRouteProps = {
  requiredRole?: UserRole;
};

export default function ProtectedRoute({
  requiredRole,
}: ProtectedRouteProps) {
  const {
    userId,
    activeRole,
    authorizedRoles,
  } = useSession();

  const decision = getRouteAccessDecision(
    {
      userId,
      activeRole,
      authorizedRoles,
    },
    requiredRole,
  );

  if (decision.outcome === "redirect") {
    return (
      <Navigate
        to={decision.to}
        replace
      />
    );
  }

  return <Outlet />;
}