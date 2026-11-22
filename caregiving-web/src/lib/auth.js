export const getStoredUser = () => {
  const rawUser = localStorage.getItem("loggedUser");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error("Failed to parse stored user", error);
    return null;
  }
};

export const getAuthToken = () => localStorage.getItem("authToken");

export const saveAuthSession = ({ token, user }) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("loggedUser", JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
};

export const clearAuthSession = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("loggedUser");
  localStorage.removeItem("rememberPass");
  window.dispatchEvent(new Event("auth-changed"));
};
