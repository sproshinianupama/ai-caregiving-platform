import { useRef, useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch, buildUploadUrl } from "../lib/api";
import { showPopup } from "../lib/popup";
import { useLanguage } from "../lib/language";

function CareseekerDashboard() {
  const storedUser = JSON.parse(localStorage.getItem("loggedUser"));
  const isAuthorized = storedUser && storedUser.role === "careseeker";
  const { t } = useLanguage();

  const [profile, setProfile] = useState({
    name: storedUser?.fullName || "",
    nic: storedUser?.nic || "",
    email: storedUser?.email || "",
    mobile: storedUser?.mobile || "",
    address: storedUser?.address || "",
  });
  const [editing, setEditing] = useState(false);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(storedUser?.profilePhoto || "");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [ratingStates, setRatingStates] = useState({});
  const fileInputRef = useRef(null);

  const loadRequests = useCallback(async () => {
    if (!storedUser?.id) return;
    try {
      const res = await fetch(`http://localhost:5001/api/requests/careseeker/${storedUser.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load requests");
      setBookingHistory(data);
    } catch (error) {
      console.error(error);
    }
  }, [storedUser?.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  if (!isAuthorized) {
    return <div className="text-center mt-20 text-red-600 font-bold">{t("accessDenied")}</div>;
  }

  const handleEdit = () => setEditing(true);

  const handleSave = () => {
    setEditing(false);
    const updatedUser = { ...storedUser, ...profile };
    localStorage.setItem("loggedUser", JSON.stringify(updatedUser));
    showPopup({ type: "success", title: t("profileUpdated"), message: t("profileSavedSuccessfully") });
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

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
      showPopup({ type: "warning", title: t("photoNotSupported"), message: t("chooseJpgOrPng") });
      return;
    }
    const formData = new FormData();
    formData.append("profilePhoto", file);
    try {
      setPhotoSaving(true);
      const data = await apiFetch(`/api/careseekers/${storedUser.id}/profile-photo`, { method: "PATCH", body: formData });
      updateStoredProfilePhoto(data.profilePhoto || "");
      showPopup({ type: "success", title: t("profilePhotoSaved"), message: t("photoSavedAutomatically") });
    } catch (photoError) {
      showPopup({ type: "error", title: t("photoSaveFailed"), message: photoError.message });
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setPhotoSaving(true);
      await apiFetch(`/api/careseekers/${storedUser.id}/profile-photo`, { method: "DELETE" });
      updateStoredProfilePhoto("");
      showPopup({ type: "success", title: t("profilePhotoDeleted"), message: t("profilePhotoRemoved") });
    } catch (photoError) {
      showPopup({ type: "error", title: t("deleteFailed"), message: photoError.message });
    } finally {
      setPhotoSaving(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === "accepted") return "text-green-700";
    if (status === "declined") return "text-red-700";
    if (status === "completed") return "text-blue-700";
    return "text-amber-700";
  };

  const setHoverStar = (requestId, star) => {
    setRatingStates((prev) => ({ ...prev, [requestId]: { ...prev[requestId], hover: star } }));
  };

  const handleSubmitRating = async (requestId, star) => {
    setRatingStates((prev) => ({ ...prev, [requestId]: { ...prev[requestId], submitting: true } }));
    try {
      const res = await fetch(`http://localhost:5001/api/requests/${requestId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: star })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit rating");
      showPopup({ type: "success", title: t("ratingSubmitted"), message: `You rated this booking ${star} star${star > 1 ? "s" : ""}.` });
      await loadRequests();
    } catch (error) {
      showPopup({ type: "error", title: t("ratingFailed"), message: error.message });
    } finally {
      setRatingStates((prev) => ({ ...prev, [requestId]: { ...prev[requestId], submitting: false } }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <Navbar />
      <div className="flex flex-1 p-4 sm:p-6 lg:p-8 gap-6 lg:gap-8 flex-col lg:flex-row">
        {/* Left — profile card */}
        <div className="bg-white rounded-xl p-4 sm:p-6 w-full lg:w-80 shadow-lg">
          <div className="flex flex-col items-center mb-4">
            <div className="w-28 h-28 rounded-full bg-blue-100 overflow-hidden shadow-inner flex items-center justify-center">
              {profilePhoto ? (
                <img src={buildUploadUrl(profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-blue-600">
                  {(profile.name || storedUser?.username || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handlePhotoSelect} className="hidden" />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoSaving}
                className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60">
                {profilePhoto ? t("editPhoto") : t("addPhoto")}
              </button>
              {profilePhoto && (
                <button type="button" onClick={handlePhotoDelete} disabled={photoSaving}
                  className="bg-red-500 text-white px-3 py-1 rounded disabled:opacity-60">
                  {t("delete")}
                </button>
              )}
            </div>
            {photoSaving && <p className="text-xs text-blue-700 mt-2">{t("savingPhoto")}</p>}
          </div>

          <div className="space-y-2">
            {[
              { key: "name", label: t("fullNameLabel") },
              { key: "nic", label: t("nicLabel") },
              { key: "email", label: t("emailLabel") },
              { key: "mobile", label: t("mobileLabel") },
              { key: "address", label: t("addressLabel") },
            ].map(({ key, label }) => (
              <div key={key}>
                <strong>{label}:</strong>{" "}
                {editing ? (
                  <input name={key} value={profile[key]} onChange={handleChange}
                    className="border-b border-gray-400 focus:outline-none w-full" />
                ) : (profile[key] || t("notAddedYet"))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between">
            {!editing ? (
              <button onClick={handleEdit} className="bg-red-500 text-white px-4 py-1 rounded">{t("edit")}</button>
            ) : (
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded">{t("save")}</button>
            )}
          </div>
        </div>

        {/* Right — booking requests */}
        <div className="flex-1 bg-white rounded-xl p-4 sm:p-6 shadow-lg">
          <h2 className="text-center font-bold text-lg bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white py-2 rounded-md mb-6">
            {t("myBookingRequests")}
          </h2>
          <div className="space-y-6">
            {bookingHistory.length === 0 && (
              <div className="bg-white rounded-xl p-4">{t("noBookingRequestsYet")}</div>
            )}
            {bookingHistory.map((booking) => (
              <div key={booking._id} className="bg-blue-50 rounded-xl p-4 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{booking.caregiverName} - {booking.careType || "Caregiving"}</p>
                  <p>{t("bookingDate")}: {new Date(booking.serviceDate).toLocaleDateString()}</p>
                  <p>{t("bookingCity")}: {booking.city || t("noCity")}</p>
                  <p>{t("careRecipient")}: {booking.careRecipientName || t("notAddedYet")}</p>
                  <p>{t("emergencyCasesLabel")}: {booking.emergencyCases}</p>
                  <p className={`font-semibold mt-2 ${getStatusColor(booking.status)}`}>
                    {t("bookingStatus")}: {booking.status}
                  </p>
                  <p className="text-sm mt-1 text-slate-700">{t("bookingMessage")}: {booking.statusMessage}</p>

                  {booking.status === "completed" && (
                    <div className="mt-3">
                      {booking.rating ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t("yourRating")}</p>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map((star) => (
                              <span key={star} className={`text-2xl ${star <= booking.rating ? "text-yellow-400" : "text-gray-300"}`}>★</span>
                            ))}
                          </div>
                          {booking.ratingComment && (
                            <p className="text-xs text-gray-600 mt-1 italic">"{booking.ratingComment}"</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t("rateThisCaregiver")}</p>
                          <div className="flex gap-1" onMouseLeave={() => setHoverStar(booking._id, 0)}>
                            {[1,2,3,4,5].map((star) => {
                              const hoverVal = ratingStates[booking._id]?.hover || 0;
                              const isSubmitting = ratingStates[booking._id]?.submitting || false;
                              return (
                                <button key={star} type="button" disabled={isSubmitting}
                                  onClick={() => handleSubmitRating(booking._id, star)}
                                  onMouseEnter={() => setHoverStar(booking._id, star)}
                                  className={`text-2xl transition-colors disabled:opacity-50 ${star <= hoverVal ? "text-yellow-400" : "text-gray-300"}`}
                                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}>★</button>
                              );
                            })}
                          </div>
                          {ratingStates[booking._id]?.submitting && (
                            <p className="text-xs text-blue-600 mt-1">{t("submitting")}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CareseekerDashboard;
