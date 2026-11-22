import { useState } from "react";

import { useLanguage } from "../lib/language";
import { showPopup } from "../lib/popup";

const districtOptions = [
  { key: "Ampara", en: "Ampara", si: "අම්පාර" },
  { key: "Anuradhapura", en: "Anuradhapura", si: "අනුරාධපුර" },
  { key: "Badulla", en: "Badulla", si: "බදුල්ල" },
  { key: "Batticaloa", en: "Batticaloa", si: "මඩකලපුව" },
  { key: "Colombo", en: "Colombo", si: "කොළඹ" },
  { key: "Galle", en: "Galle", si: "ගාල්ල" },
  { key: "Gampaha", en: "Gampaha", si: "ගම්පහ" },
  { key: "Hambantota", en: "Hambantota", si: "හම්බන්තොට" },
  { key: "Jaffna", en: "Jaffna", si: "යාපනය" },
  { key: "Kalutara", en: "Kalutara", si: "කළුතර" },
  { key: "Kandy", en: "Kandy", si: "මහනුවර" },
  { key: "Kegalle", en: "Kegalle", si: "කෑගල්ල" },
  { key: "Kilinochchi", en: "Kilinochchi", si: "කිලිනොච්චි" },
  { key: "Kurunegala", en: "Kurunegala", si: "කුරුණෑගල" },
  { key: "Mannar", en: "Mannar", si: "මන්නාරම" },
  { key: "Matale", en: "Matale", si: "මාතලේ" },
  { key: "Matara", en: "Matara", si: "මාතර" },
  { key: "Monaragala", en: "Monaragala", si: "මොනරාගල" },
  { key: "Mullaitivu", en: "Mullaitivu", si: "මුලතිව්" },
  { key: "Nuwara Eliya", en: "Nuwara Eliya", si: "නුවරඑළිය" },
  { key: "Polonnaruwa", en: "Polonnaruwa", si: "පොළොන්නරුව" },
  { key: "Puttalam", en: "Puttalam", si: "පුත්තලම" },
  { key: "Ratnapura", en: "Ratnapura", si: "රත්නපුර" },
  { key: "Trincomalee", en: "Trincomalee", si: "ත්‍රිකුණාමලය" },
  { key: "Vavuniya", en: "Vavuniya", si: "වවුනියාව" }
];

function FindCaregiver({ onClose, openLogin }) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "",
    nic: "",
    email: "",
    mobile: "",
    address: "",
    district: "",
    city: "",
    emergency: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const tempErrors = {};

    if (!formData.fullName.trim()) tempErrors.fullName = t("fullNameRequired");

    const nicOldPattern = /^[0-9]{9}[vV]$/;
    const nicNewPattern = /^[0-9]{12}$/;
    if (!nicOldPattern.test(formData.nic) && !nicNewPattern.test(formData.nic)) {
      tempErrors.nic = t("nicRequiredFormat");
    }

    if (!formData.email.includes("@")) tempErrors.email = t("invalidEmailAddress");

    const mobilePattern = /^(0|\+94)[0-9]{9}$/;
    if (!mobilePattern.test(formData.mobile)) tempErrors.mobile = t("mobileRequiredFormat");
    if (!mobilePattern.test(formData.emergency)) tempErrors.emergency = t("emergencyRequiredFormat");

    if (!formData.district) tempErrors.district = t("selectDistrictError");
    if (!formData.city.trim()) tempErrors.city = t("cityRequired");
    if (!formData.username.trim()) tempErrors.username = t("usernameRequired");
    if (!formData.password) tempErrors.password = t("passwordRequired");
    if (formData.password !== formData.confirmPassword) {
      tempErrors.confirmPassword = t("passwordsDoNotMatch");
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const { confirmPassword, ...dataToSend } = formData;
      const selectedDistrict = districtOptions.find(
        (district) => district.key === formData.district
      );

      const payload = {
        ...dataToSend,
        district: selectedDistrict
          ? language === "si"
            ? selectedDistrict.si
            : selectedDistrict.en
          : dataToSend.district
      };

      const res = await fetch("http://localhost:5001/api/auth/register-careseeker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showPopup({
          type: "success",
          title: "Registration complete",
          message: t("registrationSuccessful")
        });
        onClose?.();
        openLogin?.();
      } else {
        showPopup({
          type: "error",
          title: "Registration failed",
          message: data.message || t("registrationFailed")
        });
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] rounded-xl shadow-2xl border-4 border-blue-800 p-6 relative flex flex-col">
        <button
          onClick={() => onClose?.()}
          className="absolute top-3 right-4 text-xl font-bold hover:text-red-600"
        >
          X
        </button>

        <h2 className="text-2xl font-bold text-center italic mb-6">
          {t("careSeekerRegistration")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm overflow-y-auto pr-2 flex-1">
          <input
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            lang={language}
            placeholder={t("yourFullName")}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}

          <input
            name="nic"
            value={formData.nic}
            onChange={handleChange}
            required
            placeholder={t("nicNumber")}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.nic && <p className="text-red-500 text-xs">{errors.nic}</p>}

          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            type="email"
            placeholder={t("emailAddress")}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

          <input
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
            placeholder={t("mobileWhatsapp")}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.mobile && <p className="text-red-500 text-xs">{errors.mobile}</p>}

          <input
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            lang={language}
            placeholder={t("address")}
            className="w-full border-b border-black focus:outline-none"
          />

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="w-full border-b border-black focus:outline-none"
                required
              >
                <option value="">{t("selectDistrict")}</option>
                {districtOptions.map((district) => (
                  <option key={district.key} value={district.key}>
                    {language === "si" ? district.si : district.en}
                  </option>
                ))}
              </select>
              {errors.district && <p className="text-red-500 text-xs">{errors.district}</p>}
            </div>

            <div className="w-full sm:w-1/2">
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                lang={language}
                placeholder={t("cityTown")}
                className="w-full border-b border-black focus:outline-none"
              />
              {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
            </div>
          </div>

          <input
            name="emergency"
            value={formData.emergency}
            onChange={handleChange}
            required
            placeholder={t("emergencyPhoneNumber")}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.emergency && <p className="text-red-500 text-xs">{errors.emergency}</p>}

          <div className="mt-8 border border-blue-600 rounded-lg p-4">
            <h3 className="text-center font-semibold mb-4 text-blue-700">
              {t("createAccount")}
            </h3>

            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              lang={language}
              placeholder={t("username")}
              className="w-full border border-gray-400 rounded-md px-3 py-2 mb-3 focus:outline-none"
            />
            {errors.username && <p className="text-red-500 text-xs mb-2">{errors.username}</p>}

            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              type="password"
              placeholder={t("password")}
              className="w-full border border-gray-400 rounded-md px-3 py-2 mb-3 focus:outline-none"
            />
            {errors.password && <p className="text-red-500 text-xs mb-2">{errors.password}</p>}

            <input
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              type="password"
              placeholder={t("confirmPassword")}
              className="w-full border border-gray-400 rounded-md px-3 py-2 focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="text-center pt-6">
            <button type="submit" className="bg-blue-600 text-white px-10 py-2 rounded-full">
              {t("registerNowButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FindCaregiver;
