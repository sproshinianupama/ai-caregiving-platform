import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import logo from "../assets/logo.png";
import { clearAuthSession, getStoredUser } from "../lib/auth";
import { useLanguage } from "../lib/language";
import { showPopup } from "../lib/popup";
import LanguageSwitcher from "./LanguageSwitcher";

function Navbar({ onFindCaregiver, onBecomeCaregiver, onLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-changed", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-changed", syncUser);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.reload();
  };

  const handleEmergencyAccess = () => {
    if (!user) {
      onLogin?.();
      return;
    }

    if (user.role !== "careseeker") {
      showPopup({
        type: "warning",
        title: "Careseeker access only",
        message: t("onlyCareseekersEmergency")
      });
      return;
    }

    navigate("/emergency");
  };

  const showRoleButtons =
    !user ||
    user.role !== "careseeker" ||
    location.pathname !== "/careseeker-dashboard";

  return (
    <nav className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt={t("brandTitle")} className="h-20 w-auto" />
          <div>
            <h1 className="font-bold text-lg">{t("brandTitle")}</h1>
            <p className="text-xs text-gray-600">{t("brandTagline")}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 font-medium">
          <LanguageSwitcher />

          <Link
            to="/"
            className={`px-2 py-1 rounded ${
              location.pathname === "/" ? "bg-blue-600 text-white" : ""
            }`}
          >
            {t("home")}
          </Link>

          {showRoleButtons && (
            <>
              <button onClick={onFindCaregiver}>{t("findCaregiver")}</button>
              <button onClick={onBecomeCaregiver}>{t("becomeCaregiver")}</button>
            </>
          )}

          <Link
            to="/request-caregiver"
            className={`px-2 py-1 rounded ${
              location.pathname === "/request-caregiver"
                ? "bg-blue-600 text-white"
                : ""
            }`}
          >
            {t("requestCaregiver")}
          </Link>

          <button
            onClick={handleEmergencyAccess}
            className={`px-4 py-2 rounded-md ${
              location.pathname === "/emergency"
                ? "bg-red-600 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {t("emergency")}
          </button>

          {user && user.role === "caregiver" && (
            <Link
              to="/caregiver-dashboard"
              className={`px-2 py-1 rounded ${
                location.pathname === "/caregiver-dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-blue-600 font-semibold"
              }`}
            >
              {t("dashboard")}
            </Link>
          )}

          {user && user.role === "careseeker" && (
            <Link
              to="/careseeker-dashboard"
              className={`px-2 py-1 rounded ${
                location.pathname === "/careseeker-dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-blue-600 font-semibold"
              }`}
            >
              {t("dashboard")}
            </Link>
          )}

          {user && user.role === "admin" && (
            <Link
              to="/admin-dashboard"
              className={`px-2 py-1 rounded ${
                location.pathname === "/admin-dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-blue-600 font-semibold"
              }`}
            >
              {t("dashboard")}
            </Link>
          )}

          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full"
                  aria-label={t("dashboard")}
                >
                  U
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 bg-white shadow-md rounded-md p-3 w-32 z-50">
                    <p className="text-sm mb-2 text-center">{user.username}</p>
                    <button
                      onClick={handleLogout}
                      className="text-red-600 font-semibold w-full"
                    >
                      {t("logout")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onLogin}
                className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-4 py-2 rounded-md"
              >
                {t("login")}
              </button>
            )}
          </div>
        </div>

        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="menu"
        >
          =
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 font-medium">
          <LanguageSwitcher />

          <Link to="/" onClick={() => setMenuOpen(false)}>
            {t("home")}
          </Link>

          {showRoleButtons && (
            <>
              <button
                onClick={() => {
                  onFindCaregiver?.();
                  setMenuOpen(false);
                }}
                className="text-left"
              >
                {t("findCaregiver")}
              </button>

              <button
                onClick={() => {
                  onBecomeCaregiver?.();
                  setMenuOpen(false);
                }}
                className="text-left"
              >
                {t("becomeCaregiver")}
              </button>
            </>
          )}

          <Link to="/request-caregiver" onClick={() => setMenuOpen(false)}>
            {t("requestCaregiver")}
          </Link>

          <button
            className="bg-red-500 text-white px-4 py-2 rounded-md w-fit text-left"
            onClick={() => {
              setMenuOpen(false);
              handleEmergencyAccess();
            }}
          >
            {t("emergency")}
          </button>

          {user && user.role === "caregiver" && (
            <Link
              to="/caregiver-dashboard"
              onClick={() => setMenuOpen(false)}
              className="text-blue-600 font-semibold"
            >
              {t("dashboard")}
            </Link>
          )}

          {user && user.role === "careseeker" && (
            <Link
              to="/careseeker-dashboard"
              onClick={() => setMenuOpen(false)}
              className="text-blue-600 font-semibold"
            >
              {t("dashboard")}
            </Link>
          )}

          {user && user.role === "admin" && (
            <Link
              to="/admin-dashboard"
              onClick={() => setMenuOpen(false)}
              className="text-blue-600 font-semibold"
            >
              {t("dashboard")}
            </Link>
          )}

          {user ? (
            <button onClick={handleLogout} className="text-red-600 text-left">
              {t("logout")}
            </button>
          ) : (
            <button
              onClick={() => {
                onLogin?.();
                setMenuOpen(false);
              }}
              className="text-left"
            >
              {t("login")}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
