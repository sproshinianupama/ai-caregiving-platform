import { Navigate } from "react-router-dom";

import { getAuthToken, getStoredUser } from "../lib/auth";

function ProtectedRoute({ allowedRoles, children }) {
  const token = getAuthToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
