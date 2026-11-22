import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import LanguageSwitcher from "./LanguageSwitcher";

function CaregiverNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white shadow-md px-4 sm:px-6 lg:px-10 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={logo} alt="CareAI Sri Lanka" className="h-14 sm:h-16 lg:h-20 w-auto" />
          <div>
            <h1 className="font-bold text-base sm:text-lg">Care AI Sri Lanka</h1>
            <p className="text-xs text-gray-500 hidden sm:block">on demand. Emergency, Scheduling</p>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 lg:gap-8 font-semibold text-sm lg:text-base">
          <LanguageSwitcher />
          <Link to="/">Home</Link>
          <Link to="/predictive-requests">Predictive Requests</Link>
          <Link to="/smart-scheduling">Smart Scheduling</Link>
          <Link to="/caregiver-dashboard" className="text-blue-600">Dashboard</Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">☰</button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 flex flex-col gap-4 font-semibold text-sm pb-2">
          <LanguageSwitcher />
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/predictive-requests" onClick={() => setMenuOpen(false)}>Predictive Requests</Link>
          <Link to="/smart-scheduling" onClick={() => setMenuOpen(false)}>Smart Scheduling</Link>
          <Link to="/caregiver-dashboard" onClick={() => setMenuOpen(false)} className="text-blue-600">Dashboard</Link>
        </div>
      )}
    </div>
  );
}

export default CaregiverNavbar;
