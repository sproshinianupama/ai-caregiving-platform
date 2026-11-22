import { useEffect, useRef, useState } from "react";
import CaregiverNavbar from "../components/CaregiverNavbar";
import Footer from "../components/Footer";
import { apiFetch, buildUploadUrl } from "../lib/api";
import { getAuthToken, getStoredUser } from "../lib/auth";
import { showPopup } from "../lib/popup";
import { useLanguage } from "../lib/language";

const careTypeOptions = ["Childcare", "Eldercare", "Disabled Care"];

function CaregiverDashboard() {
  const storedUser = getStoredUser();
  const { t } = useLanguage();
  const [activeCaregiverId, setActiveCaregiverId] = useState(
    String(storedUser?.id || storedUser?._id || "")
  );
  const caregiverId = activeCaregiverId;
  const [caregiver, setCaregiver] = useState({
    name: storedUser?.fullName || storedUser?.username || "Caregiver",
    dob: "",
    age: "",
    gender: "",
    nic: storedUser?.nic || "",
    email: storedUser?.email || "",
    phone: storedUser?.mobile || "",
    address: storedUser?.address || "",
    district: "",
    city: "",
    latitude: "",
    longitude: "",
    careTypes: [],
    skills: "",
    experienceYears: "",
    rating: 0,
  });
  const [documents, setDocuments] = useState({
    nicFile: "",
    policeReport: "",
    certificates: "",
  });
  const [editing, setEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(storedUser?.profilePhoto || "");
  const [photoSaving, setPhotoSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [emergencyOn, setEmergencyOn] = useState(false);
  const [requests, setRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [conflictWarnings, setConflictWarnings] = useState({}); // { [requestId]: warningMessage }

  const applyRequestData = (data) => {
    setRequests(data.filter((item) => item.status === "pending"));
    setAcceptedRequests(
      data.filter((item) => item.status === "accepted" || item.status === "completed")
    );
  };

  const loadRequests = async () => {
    if (!caregiverId) return;

    try {
      const res = await fetch(
        `http://localhost:5001/api/requests/caregiver/${caregiverId}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load requests");
      }

      applyRequestData(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const loadCaregiverProfile = async () => {
      if (!caregiverId) return;

      try {
        const res = await fetch(`http://localhost:5001/api/caregivers/${caregiverId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load caregiver profile");
        }

        if (data._id) {
          setActiveCaregiverId(String(data._id));
        }

        setCaregiver({
          name: data.fullName || data.username || "Caregiver",
          dob: data.dob || "",
          age: data.age ?? "",
          gender: data.gender || "",
          nic: data.nic || "",
          email: data.email || "",
          phone: data.mobile || "",
          address: data.address || "",
          district: data.district || "",
          city: data.city || "",
          latitude: data.latitude ?? "",
          longitude: data.longitude ?? "",
          careTypes: Array.isArray(data.careTypes) ? data.careTypes : [],
          skills: data.skills || "",
          experienceYears: data.experienceYears ?? "",
          rating: 0,
        });
        setDocuments({
          nicFile: data.documents?.nicFile || "",
          policeReport: data.documents?.policeReport || "",
          certificates: data.documents?.certificates || "",
        });
        setProfilePhoto(data.documents?.profilePhoto || storedUser?.profilePhoto || "");
        setEmergencyOn(Boolean(data.emergencyAvailable));
      } catch (error) {
        console.error(error);
      }
    };

    const loadInitialRequests = async () => {
      if (!caregiverId) return;

      try {
        const res = await fetch(
          `http://localhost:5001/api/requests/caregiver/${caregiverId}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load requests");
        }

        applyRequestData(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadCaregiverProfile();
    loadInitialRequests();
  }, [caregiverId]);

  const updateEmergencyStatus = async (nextValue) => {
    if (!caregiverId) return;

    try {
      const res = await fetch(
        `http://localhost:5001/api/caregivers/${caregiverId}/emergency-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emergencyAvailable: nextValue }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update emergency status");
      }

      setEmergencyOn(Boolean(data.caregiver.emergencyAvailable));
    } catch (error) {
      console.error(error);
      showPopup({
        type: "error",
        title: "Emergency status not updated",
        message: error.message
      });
    }
  };

  const handleEdit = () => setEditing(true);

  const handleSave = async () => {
    if (!caregiverId) {
      showPopup({
        type: "error",
        title: "Profile not saved",
        message: "Caregiver account ID is missing. Please log out and log in again.",
      });
      return;
    }

    if (!getAuthToken()) {
      showPopup({
        type: "error",
        title: "Profile not saved",
        message: "Your login session expired. Please log in again and retry.",
      });
      return;
    }

    try {
      const data = await apiFetch(`/api/caregivers/${caregiverId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: caregiver.name,
          dob: caregiver.dob,
          age: caregiver.age,
          gender: caregiver.gender,
          nic: caregiver.nic,
          email: caregiver.email,
          mobile: caregiver.phone,
          address: caregiver.address,
          district: caregiver.district,
          city: caregiver.city,
          careTypes: caregiver.careTypes,
          skills: caregiver.skills,
          experienceYears: caregiver.experienceYears,
        }),
      });

      const saved = data.caregiver;
      setEditing(false);
      setCaregiver({
        name: saved.fullName || caregiver.name,
        dob: saved.dob || "",
        age: saved.age ?? "",
        gender: saved.gender || "",
        nic: saved.nic || "",
        email: saved.email || "",
        phone: saved.mobile || "",
        address: saved.address || "",
        district: saved.district || "",
        city: saved.city || "",
        latitude: saved.latitude ?? caregiver.latitude,
        longitude: saved.longitude ?? caregiver.longitude,
        careTypes: Array.isArray(saved.careTypes) ? saved.careTypes : [],
        skills: saved.skills || "",
        experienceYears: saved.experienceYears ?? "",
        rating: caregiver.rating,
      });

      const updatedUser = {
        ...storedUser,
        fullName: saved.fullName || caregiver.name,
        nic: saved.nic || "",
        email: saved.email || "",
        mobile: saved.mobile || "",
        address: saved.address || "",
        district: saved.district || "",
        city: saved.city || "",
      };
      localStorage.setItem("loggedUser", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("auth-changed"));

      showPopup({
        type: "success",
        title: "Profile updated",
        message: "Profile saved successfully. Matching will now use your updated care types and skills.",
      });
    } catch (error) {
      showPopup({
        type: "error",
        title: "Profile not saved",
        message: error.message,
      });
    }
  };

  const handleChange = (e) =>
    setCaregiver({ ...caregiver, [e.target.name]: e.target.value });

  const handleCareTypeToggle = (careType) => {
    setCaregiver((prev) => ({
      ...prev,
      careTypes: prev.careTypes.includes(careType)
        ? prev.careTypes.filter((item) => item !== careType)
        : [...prev.careTypes, careType],
    }));
  };

  const renderField = (label, fieldName, value, options = {}) => {
    const { type = "text", readOnly = false } = options;
    const displayValue =
      value === "" || value === null || value === undefined ? "Not added yet" : value;

    return (
      <div>
        <strong>{label}:</strong>{" "}
        {editing && !readOnly ? (
          <input
            name={fieldName}
            type={type}
            value={value}
            onChange={handleChange}
            className="border-b border-gray-400 focus:outline-none w-full"
          />
        ) : (
          displayValue
        )}
      </div>
    );
  };

  const renderDocumentLink = (label, filename) => (
    <div>
      <strong>{label}:</strong>{" "}
      {filename ? (
        <a
          href={buildUploadUrl(filename)}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          View file
        </a>
      ) : (
        "Not uploaded yet"
      )}
    </div>
  );

  const updateStoredProfilePhoto = (nextPhoto) => {
    setProfilePhoto(nextPhoto);
    const updatedUser = { ...storedUser, profilePhoto: nextPhoto };
    localStorage.setItem("loggedUser", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("auth-changed"));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showPopup({
        type: "warning",
        title: "Photo not supported",
        message: "Please choose a JPG or PNG profile photo.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("profilePhoto", file);

    try {
      setPhotoSaving(true);
      const data = await apiFetch(`/api/caregivers/${caregiverId}/profile-photo`, {
        method: "PATCH",
        body: formData,
      });

      updateStoredProfilePhoto(data.profilePhoto || "");
      showPopup({
        type: "success",
        title: "Profile photo saved",
        message: "Your new profile photo was saved automatically.",
      });
    } catch (photoError) {
      showPopup({
        type: "error",
        title: "Photo save failed",
        message: photoError.message,
      });
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setPhotoSaving(true);
      await apiFetch(`/api/caregivers/${caregiverId}/profile-photo`, {
        method: "DELETE",
      });

      updateStoredProfilePhoto("");
      showPopup({
        type: "success",
        title: "Profile photo deleted",
        message: "Your profile photo was removed successfully.",
      });
    } catch (photoError) {
      showPopup({
        type: "error",
        title: "Delete failed",
        message: photoError.message,
      });
    } finally {
      setPhotoSaving(false);
    }
  };

  // Derive the full slot range (e.g. "2:00 PM - 4:00 PM") from a serviceDate timestamp.
  // The 6 default 2-hour slots start at 8 AM. We find which slot window the time falls in.
  const DEFAULT_SLOT_RANGES = [
    "8:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
  ];

  const parseTime12hToMins = (str) => {
    const m = str.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  const getSlotRange = (date) => {
    if (!date) return "—";
    const reqMins = date.getHours() * 60 + date.getMinutes();
    for (const range of DEFAULT_SLOT_RANGES) {
      const [start, end] = range.split(" - ");
      const s = parseTime12hToMins(start);
      const e = parseTime12hToMins(end);
      if (s !== null && e !== null && reqMins >= s && reqMins < e) return range;
    }
    // Fallback: format as a readable time if no slot matched
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const updateRequestStatus = async (requestId, status) => {
    // ── Conflict check: block accepting if same date+time slot already accepted ──
    if (status === "accepted") {
      const incoming = requests.find((r) => r._id === requestId);
      if (incoming?.serviceDate) {
        const incomingSlot = getSlotRange(new Date(incoming.serviceDate));
        const incomingDate = new Date(incoming.serviceDate).toLocaleDateString("en-GB");

        const conflict = acceptedRequests.find((acc) => {
          if (acc.status !== "accepted") return false;
          const accDate = new Date(acc.serviceDate).toLocaleDateString("en-GB");
          const accSlot = getSlotRange(new Date(acc.serviceDate));
          return accDate === incomingDate && accSlot === incomingSlot;
        });

        if (conflict) {
          setConflictWarnings((prev) => ({
            ...prev,
            [requestId]: `Already accepted a request for ${incomingDate} · ${incomingSlot}. You can only accept one request per time slot.`,
          }));
          return;
        }
      }
      // Clear any previous warning for this request
      setConflictWarnings((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    }

    try {
      const res = await fetch(
        `http://localhost:5001/api/requests/${requestId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update request");
      }

      loadRequests();
    } catch (error) {
      console.error(error);
      showPopup({
        type: "error",
        title: "Request update failed",
        message: error.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <CaregiverNavbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 flex gap-6 lg:gap-8 flex-col lg:flex-row">
        <div className="w-full lg:w-1/3 bg-white rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col items-center mb-4">
            <div className="w-28 h-28 rounded-full bg-blue-100 overflow-hidden shadow-inner flex items-center justify-center">
              {profilePhoto ? (
                <img
                  src={buildUploadUrl(profilePhoto)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-blue-600">
                  {(caregiver.name || storedUser?.username || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoSaving}
                className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60"
              >
                {profilePhoto ? "Edit Photo" : "Add Photo"}
              </button>

              {profilePhoto && (
                <button
                  type="button"
                  onClick={handlePhotoDelete}
                  disabled={photoSaving}
                  className="bg-red-500 text-white px-3 py-1 rounded disabled:opacity-60"
                >
                  Delete
                </button>
              )}
            </div>

            {photoSaving && (
              <p className="text-xs text-blue-700 mt-2">Saving photo...</p>
            )}
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => updateEmergencyStatus(true)}
              className={`px-4 py-2 rounded-full text-white ${
                emergencyOn ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              Emergency ON
            </button>

            <button
              onClick={() => updateEmergencyStatus(false)}
              className={`px-4 py-2 rounded-full text-white ${
                !emergencyOn ? "bg-red-600" : "bg-gray-400"
              }`}
            >
              Emergency OFF
            </button>
          </div>

          <div className="space-y-2 text-sm max-h-[420px] overflow-y-auto pr-1">
            {renderField("Full Name", "name", caregiver.name)}
            {renderField("Date of Birth", "dob", caregiver.dob, { type: "date" })}
            {renderField("Age", "age", caregiver.age, { type: "number" })}
            {renderField("Gender", "gender", caregiver.gender)}
            {renderField("NIC", "nic", caregiver.nic)}
            {renderField("Email", "email", caregiver.email)}
            {renderField("Mobile", "phone", caregiver.phone)}
            {renderField("Address", "address", caregiver.address)}
            {renderField("District", "district", caregiver.district)}
            {renderField("City", "city", caregiver.city)}
            {renderField("Latitude", "latitude", caregiver.latitude, { readOnly: true })}
            {renderField("Longitude", "longitude", caregiver.longitude, { readOnly: true })}

            <div>
              <strong>Care Types:</strong>{" "}
              {editing ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {careTypeOptions.map((careType) => (
                    <label key={careType} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={caregiver.careTypes.includes(careType)}
                        onChange={() => handleCareTypeToggle(careType)}
                      />
                      <span>{careType}</span>
                    </label>
                  ))}
                </div>
              ) : caregiver.careTypes.length > 0 ? (
                caregiver.careTypes.join(", ")
              ) : (
                "Not added yet"
              )}
            </div>

            <div>
              <strong>Skills:</strong>{" "}
              {editing ? (
                <textarea
                  name="skills"
                  value={caregiver.skills}
                  onChange={handleChange}
                  rows={2}
                  className="border border-gray-300 rounded w-full mt-1 px-2 py-1"
                />
              ) : (
                caregiver.skills || "Not added yet"
              )}
            </div>

            {renderField(
              "Years of Experience",
              "experienceYears",
              caregiver.experienceYears,
              { type: "number" }
            )}

            {renderDocumentLink("NIC Document", documents.nicFile)}
            {renderDocumentLink("Police Report", documents.policeReport)}
            {renderDocumentLink("Certificates", documents.certificates)}

            {/* Ratings summary — read-only */}
            {(() => {
              const ratedRequests = acceptedRequests.filter(
                (item) => item.status === "completed" && item.rating
              );
              const avgRating =
                ratedRequests.length > 0
                  ? ratedRequests.reduce((sum, item) => sum + item.rating, 0) /
                    ratedRequests.length
                  : null;

              return (
                <div>
                  <strong>Ratings:</strong>{" "}
                  {avgRating !== null ? (
                    <span>
                      {avgRating.toFixed(1)} / 5{" "}
                      <span className="text-yellow-400">
                        {"★".repeat(Math.round(avgRating))}
                        {"☆".repeat(5 - Math.round(avgRating))}
                      </span>{" "}
                      <span className="text-gray-500 text-xs">
                        ({ratedRequests.length} review{ratedRequests.length !== 1 ? "s" : ""})
                      </span>
                    </span>
                  ) : (
                    "No ratings yet"
                  )}
                </div>
              );
            })()}

            <p><strong>Accepted requests:</strong> {acceptedRequests.length}</p>
          </div>

          <div className="mt-4 flex justify-between">
            {!editing ? (
              <button
                onClick={handleEdit}
                className="bg-red-500 text-white px-4 py-1 rounded"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-1 rounded"
              >
                Save
              </button>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3 space-y-6 sm:space-y-8">
          {/* ── New Requests (shown first so caregiver sees them immediately) ── */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-4 py-1 rounded-full inline-block font-semibold mb-4">
              New Requests
            </h2>

            {requests.length === 0 && (
              <p className="text-sm">No pending requests right now.</p>
            )}

            {requests.map((req) => {
              const svcDate = req.serviceDate ? new Date(req.serviceDate) : null;
              const svcDateStr = svcDate
                ? svcDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "—";
              const svcTimeStr = getSlotRange(svcDate);
              const warning = conflictWarnings[req._id];

              return (
                <div
                  key={req._id}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-blue-900">
                      New request from {req.careseekerName}
                    </p>
                    <span className="text-[11px] bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-full font-medium">
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-4">
                    <p><span className="font-medium text-gray-600">📅 Date:</span> {svcDateStr}</p>
                    <p><span className="font-medium text-gray-600">⏰ Time:</span> {svcTimeStr}</p>
                    <p><span className="font-medium text-gray-600">🏥 Care Type:</span> {req.careType || "—"}</p>
                    <p><span className="font-medium text-gray-600">📍 City:</span> {req.city || "—"}</p>
                    <p className="sm:col-span-2"><span className="font-medium text-gray-600">🏠 Address:</span> {req.address || "—"}</p>
                    <p><span className="font-medium text-gray-600">👤 Careseeker Name:</span> {req.careseekerName || "—"}</p>
                    <p><span className="font-medium text-gray-600">📞 Mobile:</span> {req.mobileNumber || "—"}</p>
                    <p><span className="font-medium text-gray-600">🧒 Recipient Name:</span> {req.careRecipientName || "—"}</p>
                    <p><span className="font-medium text-gray-600">🎂 Recipient Age:</span> {req.careRecipientAge ?? "—"}</p>
                    <p className="sm:col-span-2"><span className="font-medium text-gray-600">💊 Special Care Needs:</span> {req.specialCareNeeds || "—"}</p>
                    <p><span className="font-medium text-gray-600">🚨 Emergency Cases:</span> {req.emergencyCases ?? 0}</p>
                  </div>

                  {/* Conflict warning */}
                  {warning && (
                    <div className="mb-3 flex items-start gap-2 bg-orange-50 border border-orange-300 text-orange-800 text-xs rounded-lg px-3 py-2">
                      <span className="text-base leading-none">⚠️</span>
                      <span>{warning}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => updateRequestStatus(req._id, "accepted")}
                      className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => updateRequestStatus(req._id, "declined")}
                      className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-red-700"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Accepted Bookings ── */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-4 py-1 rounded-full inline-block font-semibold mb-4">
              Accepted Bookings
            </h2>

            <div className="text-sm space-y-3">
              {acceptedRequests.length === 0 && (
                <p>No accepted bookings yet.</p>
              )}

              {acceptedRequests.slice(0, 8).map((item) => (
                <div key={item._id} className="bg-blue-50 rounded-lg p-3 flex justify-between items-center gap-3">
                  <div>
                    <p className="font-medium">{item.careseekerName}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(item.serviceDate).toLocaleDateString()} · {item.city || "No city"} · {item.status}
                    </p>
                  </div>
                  {item.status === "accepted" && (
                    <button
                      onClick={() => updateRequestStatus(item._id, "completed")}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full"
                    >
                      Mark Completed
                    </button>
                  )}
                  {item.status === "completed" && (
                    <span className="shrink-0 text-xs text-green-700 font-semibold">✓ Completed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ratings received — read-only, caregiver cannot edit */}
          {(() => {
            const ratedRequests = acceptedRequests.filter(
              (item) => item.status === "completed" && item.rating
            );
            const avgRating =
              ratedRequests.length > 0
                ? ratedRequests.reduce((sum, item) => sum + item.rating, 0) /
                  ratedRequests.length
                : null;

            return (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h2 className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-4 py-1 rounded-full inline-block font-semibold mb-4">
                  Ratings Received
                </h2>

                {ratedRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">No ratings received yet.</p>
                ) : (
                  <>
                    {/* Average */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-700">
                        {avgRating.toFixed(1)}
                      </div>
                      <div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-xl ${
                                star <= Math.round(avgRating)
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Average from {ratedRequests.length} review{ratedRequests.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Individual ratings list */}
                    <div className="space-y-3">
                      {ratedRequests.map((item) => (
                        <div key={item._id} className="border border-blue-100 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.careseekerName}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-base ${
                                    star <= item.rating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.serviceDate).toLocaleDateString()} · {item.careType || "Caregiving"} · {item.city || "No city"}
                          </p>
                          {item.ratingComment && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                              "{item.ratingComment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaregiverDashboard;
