import { useState } from "react";

import { useLanguage } from "../lib/language";
import { showPopup } from "../lib/popup";

const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

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

const genderOptions = [
  { key: "male", en: "Male", si: "පුරුෂ" },
  { key: "female", en: "Female", si: "ස්ත්‍රී" }
];

const careTypeOptions = ["Childcare", "Eldercare", "Disabled Care"];

function BecomeCaregiver({ onClose, openLogin }) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    age: "",
    gender: "",
    email: "",
    mobile: "",
    nic: "",
    address: "",
    district: "",
    city: "",
    latitude: "",
    longitude: "",
    username: "",
    password: "",
    confirmPassword: "",
    skills: "",
    experienceYears: ""
  });
  const [selectedCareTypes, setSelectedCareTypes] = useState([]);
  const [files, setFiles] = useState({
    nicFile: [],
    profilePhoto: null,
    policeReport: null,
    certificates: []
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const temp = {};

    if (!formData.fullName) temp.fullName = t("fullNameRequired");
    if (!formData.dob) temp.dob = t("dobRequired");
    if (!formData.age) temp.age = t("ageRequired");
    if (!formData.gender) temp.gender = t("genderRequired");
    if (!formData.email) temp.email = t("emailRequired");
    if (!formData.mobile) temp.mobile = t("mobileRequired");
    if (!formData.nic) temp.nic = t("nicRequired");
    if (!formData.address) temp.address = t("addressRequired");
    if (!formData.district) temp.district = t("districtRequired");
    if (!formData.city) temp.city = t("cityRequired");
    if (!formData.latitude || !formData.longitude) temp.location = t("currentLocationRequired");

    if (!files.nicFile || files.nicFile.length === 0) temp.nicFile = t("nicDocumentRequired");
    if (!files.profilePhoto) temp.profilePhoto = t("profilePhotoRequired");
    if (!files.policeReport) temp.policeReport = t("policeReportRequired");
    if (!files.certificates || files.certificates.length === 0) temp.certificates = t("certificatesRequired");
    if (selectedCareTypes.length === 0) temp.careTypes = "Select at least one care type";
    if (!formData.skills.trim()) temp.skills = "Skills and specializations are required";
    if (!formData.experienceYears) temp.experienceYears = "Years of experience is required";

    if (!formData.username) temp.username = t("usernameRequired");
    if (!formData.password) temp.password = t("passwordRequired");
    if (!formData.confirmPassword) temp.confirmPassword = t("confirmPasswordRequired");
    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      temp.confirmPassword = t("passwordsDoNotMatch");
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      temp.email = t("invalidEmailFormat");
    }

    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const formPayload = new FormData();
      const selectedDistrict = districtOptions.find(
        (district) => district.key === formData.district
      );
      const selectedGender = genderOptions.find(
        (gender) => gender.key === formData.gender
      );

      const formValues = {
        ...formData,
        district: selectedDistrict
          ? language === "si"
            ? selectedDistrict.si
            : selectedDistrict.en
          : formData.district,
        gender: selectedGender
          ? language === "si"
            ? selectedGender.si
            : selectedGender.en
          : formData.gender
      };

      Object.keys(formValues).forEach((key) => {
        if (key !== "confirmPassword") {
          formPayload.append(key, formValues[key]);
        }
      });

      formPayload.append("careTypes", JSON.stringify(selectedCareTypes));

      // profilePhoto and policeReport are single files
      if (files.profilePhoto) formPayload.append("profilePhoto", files.profilePhoto);
      if (files.policeReport) formPayload.append("policeReport", files.policeReport);

      // nicFile and certificates support multiple files
      files.nicFile.forEach((file) => formPayload.append("nicFile", file));
      files.certificates.forEach((file) => formPayload.append("certificates", file));

      const res = await fetch("http://localhost:5001/api/auth/register-caregiver", {
        method: "POST",
        body: formPayload
      });

      const data = await res.json();

      if (res.ok) {
        showPopup({
          type: "success",
          title: "Registration submitted successfully!",
          message: "Your details are under admin review. You will be able to log in once your account is approved."
        });
        onClose?.();
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

  const handleCareTypeToggle = (careType) => {
    setSelectedCareTypes((prev) =>
      prev.includes(careType)
        ? prev.filter((item) => item !== careType)
        : [...prev, careType]
    );
    setErrors((prev) => ({ ...prev, careTypes: "" }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({
        ...prev,
        location: t("geolocationNotSupported")
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));

        setErrors((prev) => ({
          ...prev,
          location: ""
        }));
      },
      () => {
        setErrors((prev) => ({
          ...prev,
          location: t("allowLocationAccess")
        }));
      }
    );
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    const isMulti = name === "nicFile" || name === "certificates";

    if (isMulti) {
      const fileArray = Array.from(selectedFiles);
      const invalid = fileArray.find((f) => !allowedTypes.includes(f.type));

      if (invalid) {
        setErrors((prev) => ({ ...prev, [name]: "Only PDF, PNG, JPG files are allowed" }));
        setFiles((prev) => ({ ...prev, [name]: [] }));
        e.target.value = null;
        return;
      }

      setErrors((prev) => ({ ...prev, [name]: "" }));
      setFiles((prev) => ({ ...prev, [name]: fileArray }));
    } else {
      const file = selectedFiles[0];
      if (!file) return;

      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({ ...prev, [name]: "Only PDF, PNG, JPG files are allowed" }));
        setFiles((prev) => ({ ...prev, [name]: null }));
        e.target.value = null;
        return;
      }

      setErrors((prev) => ({ ...prev, [name]: "" }));
      setFiles((prev) => ({ ...prev, [name]: file }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-xl shadow-2xl border-4 border-blue-800 p-6 relative flex flex-col">
        <button
          onClick={() => onClose?.()}
          className="absolute top-3 right-4 text-xl font-bold hover:text-red-600"
        >
          X
        </button>

        <h2 className="text-2xl font-bold text-center italic mb-6">
          {t("caregiverRegistration")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm overflow-y-auto pr-2 flex-1">
          <input
            name="fullName"
            placeholder={t("yourFullName")}
            value={formData.fullName}
            onChange={handleChange}
            lang={language}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full border-b border-black focus:outline-none"
              />
              {errors.dob && <p className="text-red-500 text-xs">{errors.dob}</p>}
            </div>
            <div className="w-full sm:w-1/2">
              <input
                name="age"
                placeholder={t("age")}
                value={formData.age}
                onChange={handleChange}
                className="w-full border-b border-black focus:outline-none"
              />
              {errors.age && <p className="text-red-500 text-xs">{errors.age}</p>}
            </div>
          </div>

          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full border-b border-black focus:outline-none"
          >
            <option value="">{t("selectGender")}</option>
            {genderOptions.map((gender) => (
              <option key={gender.key} value={gender.key}>
                {language === "si" ? gender.si : gender.en}
              </option>
            ))}
          </select>
          {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}

          <input
            name="email"
            placeholder={t("emailAddress")}
            value={formData.email}
            onChange={handleChange}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

          <input
            name="mobile"
            placeholder={t("mobileWhatsapp")}
            value={formData.mobile}
            onChange={handleChange}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.mobile && <p className="text-red-500 text-xs">{errors.mobile}</p>}

          <input
            name="nic"
            placeholder={t("nicNumber")}
            value={formData.nic}
            onChange={handleChange}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.nic && <p className="text-red-500 text-xs">{errors.nic}</p>}

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span>{t("uploadNic")} <span className="text-xs text-gray-500">(up to 5 files)</span></span>
              <input
                type="file"
                name="nicFile"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={handleFileChange}
              />
            </div>
            {files.nicFile.length > 0 && (
              <ul className="text-xs text-gray-600 pl-1 space-y-0.5">
                {files.nicFile.map((f, i) => (
                  <li key={i}>✓ {f.name}</li>
                ))}
              </ul>
            )}
          </div>
          {errors.nicFile && <p className="text-red-500 text-xs">{errors.nicFile}</p>}

          <div className="flex justify-between items-center">
            <span>{t("uploadProfilePhoto")}</span>
            <input
              type="file"
              name="profilePhoto"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
          </div>
          {errors.profilePhoto && <p className="text-red-500 text-xs">{errors.profilePhoto}</p>}

          <input
            name="address"
            placeholder={t("fullAddress")}
            value={formData.address}
            onChange={handleChange}
            lang={language}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="w-full border-b border-black focus:outline-none"
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
                placeholder={t("cityTown")}
                value={formData.city}
                onChange={handleChange}
                lang={language}
                className="w-full border-b border-black focus:outline-none"
              />
              {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
            </div>
          </div>

          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-800">{t("caregiverLocation")}</p>
                <p className="text-xs text-gray-600">{t("caregiverLocationHelp")}</p>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                {t("useCurrentLocation")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <input
                name="latitude"
                value={formData.latitude}
                readOnly
                placeholder={t("latitude")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              />
              <input
                name="longitude"
                value={formData.longitude}
                readOnly
                placeholder={t("longitude")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              />
            </div>
            {errors.location && <p className="text-red-500 text-xs mt-2">{errors.location}</p>}
          </div>

          <div className="flex justify-between items-center">
            <span>{t("policeReportUpload")}</span>
            <input
              type="file"
              name="policeReport"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
          </div>
          {errors.policeReport && <p className="text-red-500 text-xs">{errors.policeReport}</p>}

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span>{t("certificatesUpload")} <span className="text-xs text-gray-500">(up to 5 files)</span></span>
              <input
                type="file"
                name="certificates"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={handleFileChange}
              />
            </div>
            {files.certificates.length > 0 && (
              <ul className="text-xs text-gray-600 pl-1 space-y-0.5">
                {files.certificates.map((f, i) => (
                  <li key={i}>✓ {f.name}</li>
                ))}
              </ul>
            )}
          </div>
          {errors.certificates && <p className="text-red-500 text-xs">{errors.certificates}</p>}

          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <p className="font-semibold text-blue-800 mb-2">Care Types Offered</p>
            <div className="flex flex-wrap gap-3">
              {careTypeOptions.map((careType) => (
                <label key={careType} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCareTypes.includes(careType)}
                    onChange={() => handleCareTypeToggle(careType)}
                  />
                  <span>{careType}</span>
                </label>
              ))}
            </div>
            {errors.careTypes && <p className="text-red-500 text-xs mt-2">{errors.careTypes}</p>}
          </div>

          <textarea
            name="skills"
            placeholder="Skills & specializations (e.g. dementia care, mobility support, pediatric care)"
            value={formData.skills}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          {errors.skills && <p className="text-red-500 text-xs">{errors.skills}</p>}

          <input
            name="experienceYears"
            type="number"
            min="0"
            placeholder="Years of experience"
            value={formData.experienceYears}
            onChange={handleChange}
            className="w-full border-b border-black focus:outline-none"
          />
          {errors.experienceYears && (
            <p className="text-red-500 text-xs">{errors.experienceYears}</p>
          )}

          <div className="mt-6 border border-blue-600 rounded-lg p-4">
            <h3 className="text-center font-semibold mb-4 text-blue-700">
              {t("createAccount")}
            </h3>

            <input
              name="username"
              placeholder={t("username")}
              value={formData.username}
              onChange={handleChange}
              lang={language}
              className="w-full border border-gray-400 rounded-md px-3 py-2 mb-3"
            />
            {errors.username && <p className="text-red-500 text-xs mb-2">{errors.username}</p>}

            <input
              type="password"
              name="password"
              placeholder={t("password")}
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-400 rounded-md px-3 py-2 mb-3"
            />
            {errors.password && <p className="text-red-500 text-xs mb-2">{errors.password}</p>}

            <input
              type="password"
              name="confirmPassword"
              placeholder={t("confirmPassword")}
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full border border-gray-400 rounded-md px-3 py-2"
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

export default BecomeCaregiver;
