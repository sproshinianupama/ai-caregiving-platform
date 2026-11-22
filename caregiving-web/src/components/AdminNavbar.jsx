import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import logo from "../assets/logo.png";
import { clearAuthSession } from "../lib/auth";
import { useLanguage } from "../lib/language";
import LanguageSwitcher from "./LanguageSwitcher";

function AdminNavbar() {
  const location = useLocation();
  const { t } = useLanguage();

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt={t("brandTitle")} className="h-12 sm:h-16 w-auto" />
          <div>
            <h1 className="font-bold text-base sm:text-lg">{t("brandTitle")}</h1>
            <p className="text-xs text-gray-600 hidden sm:block">{t("brandTagline")}</p>
          </div>
        </div>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 font-semibold text-sm xl:text-base">
          <LanguageSwitcher />
          <Link to="/" className={location.pathname === "/" ? "text-blue-600" : ""}>{t("home")}</Link>
          <Link to="/admin-dashboard" className={location.pathname === "/admin-dashboard" ? "text-blue-600" : ""}>{t("adminHomePage")}</Link>
          <Link to="/givers-seekers" className={location.pathname === "/givers-seekers" ? "text-blue-600" : ""}>{t("caregiversAndCareseekers")}</Link>
          <Link to="/new-registrations" className={location.pathname === "/new-registrations" ? "text-blue-600" : ""}>{t("newRegistration")}</Link>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-md">{t("logout")}</button>
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">☰</button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden px-4 pb-4 flex flex-col gap-4 font-semibold text-sm border-t border-gray-100 pt-3">
          <LanguageSwitcher />
          <Link to="/" onClick={() => setMenuOpen(false)} className={location.pathname === "/" ? "text-blue-600" : ""}>{t("home")}</Link>
          <Link to="/admin-dashboard" onClick={() => setMenuOpen(false)} className={location.pathname === "/admin-dashboard" ? "text-blue-600" : ""}>{t("adminHomePage")}</Link>
          <Link to="/givers-seekers" onClick={() => setMenuOpen(false)} className={location.pathname === "/givers-seekers" ? "text-blue-600" : ""}>{t("caregiversAndCareseekers")}</Link>
          <Link to="/new-registrations" onClick={() => setMenuOpen(false)} className={location.pathname === "/new-registrations" ? "text-blue-600" : ""}>{t("newRegistration")}</Link>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-md w-fit">{t("logout")}</button>
        </div>
      )}
    </nav>
  );
}

export default AdminNavbar;
