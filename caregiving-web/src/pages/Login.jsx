import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { saveAuthSession } from "../lib/auth";
import { useLanguage } from "../lib/language";
import { showPopup } from "../lib/popup";

function Login({ onClose, openFindCaregiver, openBecomeCaregiver, onLoginSuccess }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const rememberedUser = localStorage.getItem("rememberUser") || "";
  const [username, setUsername] = useState(rememberedUser);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(rememberedUser));
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showPopup({
          type: "error",
          title: "Login failed",
          message: data.message || t("invalidCredentials")
        });
        return;
      }

      saveAuthSession(data);

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      if (remember) {
        localStorage.setItem("rememberUser", username);
      } else {
        localStorage.removeItem("rememberUser");
      }

      showPopup({
        type: "success",
        title: "Welcome back",
        message: t("loginSuccess")
      });
      onClose?.();

      if (data.user.role === "admin") {
        navigate("/admin-dashboard");
      } else if (data.user.role === "caregiver") {
        navigate("/caregiver-dashboard");
      } else if (data.user.role === "careseeker") {
        navigate("/careseeker-dashboard");
      }
    } catch (error) {
      console.error(error);
      showPopup({
        type: "error",
        title: "Connection problem",
        message: t("serverError")
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8 relative">
        <button
          onClick={() => onClose?.()}
          className="absolute top-3 right-4 text-gray-500 text-lg"
        >
          X
        </button>

        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-700">
          {t("loginTitle")}
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder={t("username")}
            className="w-full p-2 border rounded-lg"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("password")}
              className="w-full p-2 border rounded-lg pr-16"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-sm text-blue-600"
            >
              {showPassword ? t("hide") : t("show")}
            </button>
          </div>

          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              {t("rememberUsername")}
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg"
          >
            {t("login")}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          {t("noAccount")}
        </p>

        <div className="text-center mt-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              openBecomeCaregiver?.();
            }}
            className="text-blue-600 hover:underline block w-full"
          >
            {t("createCaregiver")}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();
              openFindCaregiver?.();
            }}
            className="text-blue-600 hover:underline block w-full"
          >
            {t("createCareseeker")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
