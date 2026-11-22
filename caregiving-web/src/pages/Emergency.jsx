import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FindCaregiver from "./FindCaregiver";
import BecomeCaregiver from "./BecomeCaregiver";
import Login from "./Login";
import { showPopup } from "../lib/popup";
import { buildUploadUrl } from "../lib/api";

const districtOptions = [
  "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha",
  "Hambantota","Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala",
  "Mannar","Matale","Matara","Monaragala","Mullaitivu","Nuwara Eliya",
  "Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya"
];

// ─── Caregiver Details Modal ─────────────────────────────────────────────────
function CaregiverDetailsModal({ caregiver, onClose }) {
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Today's date as YYYY-MM-DD
  const todayKey = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  useEffect(() => {
    if (!caregiver) return;

    // Fetch today's schedule
    setLoadingSchedule(true);
    fetch(`http://localhost:5001/api/schedules/${caregiver._id}?date=${todayKey}`)
      .then((r) => r.json())
      .then((data) => setScheduleSlots(Array.isArray(data.slots) ? data.slots : []))
      .catch(() => setScheduleSlots([]))
      .finally(() => setLoadingSchedule(false));

    // Fetch all requests to extract completed+rated ones
    setLoadingReviews(true);
    fetch(`http://localhost:5001/api/requests/caregiver/${caregiver._id}`)
      .then((r) => r.json())
      .then((data) => {
        const rated = Array.isArray(data)
          ? data.filter((r) => r.status === "completed" && r.rating)
          : [];
        setReviews(rated);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [caregiver, todayKey]);

  if (!caregiver) return null;

  const docs = caregiver.documents || {};
  const nicFiles = Array.isArray(docs.nicFile) ? docs.nicFile : (docs.nicFile ? [docs.nicFile] : []);
  const certificates = Array.isArray(docs.certificates) ? docs.certificates : (docs.certificates ? [docs.certificates] : []);
  const policeReport = docs.policeReport || null;
  const profilePhoto = docs.profilePhoto || null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const slotStatusColor = (status) => {
    if (status === "Booked" || status === "Manual Booking") return "bg-red-100 text-red-700 border-red-300";
    if (status === "Unavailable") return "bg-orange-100 text-orange-700 border-orange-300";
    if (status === "Cancelled") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-green-100 text-green-700 border-green-300";
  };

  const slotIcon = (status) => {
    if (status === "Booked" || status === "Manual Booking") return "🔴";
    if (status === "Unavailable") return "⛔";
    if (status === "Cancelled") return "🟡";
    return "🟢";
  };

  const isPreviewable = (filename) => /\.(png|jpe?g|gif|webp)$/i.test(filename || "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <h3 className="font-bold text-lg text-blue-900">Caregiver Profile</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">✕</button>
          </div>

          <div className="px-6 py-4 space-y-5 text-sm">

            {/* ── Profile photo + basic info ── */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0 shadow">
                {profilePhoto ? (
                  <img src={buildUploadUrl(profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-blue-600">
                    {(caregiver.fullName || "C").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-lg text-blue-900">{caregiver.fullName}</p>
                <p className="text-gray-500 text-xs">@{caregiver.username}</p>
                {avgRating && (
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-base ${s <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-300"}`}>★</span>
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{avgRating} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                  </div>
                )}
                <span className="inline-block mt-1 bg-red-100 text-red-700 text-[11px] px-2 py-0.5 rounded-full font-medium">🚨 Emergency Available</span>
              </div>
            </div>

            {/* ── Personal Details ── */}
            <div>
              <p className="font-semibold text-blue-800 mb-2 border-b pb-1">Personal Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  ["District",      caregiver.district],
                  ["City",          caregiver.city],
                  ["Age",           caregiver.age],
                  ["Gender",        caregiver.gender],
                  ["NIC",           caregiver.nic],
                  ["Email",         caregiver.email],
                  ["Mobile",        caregiver.mobile],
                  ["Address",       caregiver.address],
                  ["Date of Birth", caregiver.dob ? new Date(caregiver.dob).toLocaleDateString("en-GB") : null],
                ].map(([label, value]) => (
                  <p key={label}><span className="font-medium text-gray-600">{label}:</span> {value || "—"}</p>
                ))}
              </div>
            </div>

            {/* ── Professional Details ── */}
            <div>
              <p className="font-semibold text-blue-800 mb-2 border-b pb-1">Professional Details</p>
              <div className="space-y-1.5">
                {caregiver.careTypes?.length > 0 && (
                  <p><span className="font-medium text-gray-600">Care Types:</span> {caregiver.careTypes.join(", ")}</p>
                )}
                {caregiver.skills && (
                  <p><span className="font-medium text-gray-600">Skills:</span> {caregiver.skills}</p>
                )}
                {caregiver.experienceYears > 0 && (
                  <p><span className="font-medium text-gray-600">Experience:</span> {caregiver.experienceYears} year(s)</p>
                )}
              </div>
            </div>

            {/* ── Documents ── */}
            <div>
              <p className="font-semibold text-blue-800 mb-2 border-b pb-1">Documents & Certificates</p>
              <div className="flex flex-wrap gap-3">
                {/* NIC files */}
                {nicFiles.map((f, i) => (
                  <div key={`nic-${i}`} className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">NIC {nicFiles.length > 1 ? i+1 : ""}</p>
                    {isPreviewable(f) ? (
                      <img
                        src={buildUploadUrl(f)} alt="NIC"
                        className="w-24 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImage(buildUploadUrl(f))}
                      />
                    ) : (
                      <a href={buildUploadUrl(f)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">Open NIC</a>
                    )}
                  </div>
                ))}

                {/* Police report */}
                {policeReport && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Police Report</p>
                    {isPreviewable(policeReport) ? (
                      <img
                        src={buildUploadUrl(policeReport)} alt="Police Report"
                        className="w-24 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImage(buildUploadUrl(policeReport))}
                      />
                    ) : (
                      <a href={buildUploadUrl(policeReport)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">Open Report</a>
                    )}
                  </div>
                )}

                {/* Certificates */}
                {certificates.map((f, i) => (
                  <div key={`cert-${i}`} className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Certificate {certificates.length > 1 ? i+1 : ""}</p>
                    {isPreviewable(f) ? (
                      <img
                        src={buildUploadUrl(f)} alt="Certificate"
                        className="w-24 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImage(buildUploadUrl(f))}
                      />
                    ) : (
                      <a href={buildUploadUrl(f)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">Open Certificate</a>
                    )}
                  </div>
                ))}

                {nicFiles.length === 0 && !policeReport && certificates.length === 0 && (
                  <p className="text-gray-400 text-xs">No documents uploaded.</p>
                )}
              </div>
            </div>

            {/* ── Today's Availability ── */}
            <div>
              <p className="font-semibold text-blue-800 mb-2 border-b pb-1">
                Today's Availability <span className="font-normal text-gray-400 text-xs">({new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })})</span>
              </p>
              {loadingSchedule ? (
                <p className="text-xs text-gray-400">Loading schedule...</p>
              ) : scheduleSlots.length === 0 ? (
                <p className="text-xs text-gray-400">No schedule data for today.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {scheduleSlots.map((slot) => (
                    <span
                      key={slot.slotId}
                      className={`text-[11px] border rounded px-2 py-1 font-medium ${slotStatusColor(slot.status)}`}
                    >
                      {slot.time} {slotIcon(slot.status)}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mt-2">
                <span>🟢 Free</span><span>🔴 Booked</span><span>⛔ Unavailable</span><span>🟡 Cancelled</span>
              </div>
            </div>

            {/* ── Reviews ── */}
            <div>
              <p className="font-semibold text-blue-800 mb-2 border-b pb-1">
                Reviews {reviews.length > 0 && <span className="font-normal text-gray-400 text-xs">({reviews.length} total)</span>}
              </p>
              {loadingReviews ? (
                <p className="text-xs text-gray-400">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-gray-400">No reviews yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {reviews.map((r) => (
                    <div key={r._id} className="border border-blue-100 rounded-lg p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">{r.careseekerName}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={`text-sm ${s <= r.rating ? "text-yellow-400" : "text-gray-300"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(r.serviceDate).toLocaleDateString("en-GB")} · {r.careType || "Caregiving"}
                      </p>
                      {r.ratingComment && (
                        <p className="text-xs text-gray-600 mt-1 italic">"{r.ratingComment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer close */}
          <div className="px-6 pb-5">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="Preview" className="max-w-[95vw] max-h-[85vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
}

function Emergency() {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("loggedUser");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [allCaregivers, setAllCaregivers] = useState([]);
  const [showCaregivers, setShowCaregivers] = useState(false);
  const [showFindCaregiver, setShowFindCaregiver] = useState(false);
  const [showBecomeCaregiver, setShowBecomeCaregiver] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [contactCaregiverId, setContactCaregiverId] = useState(null);
  const [detailsCaregiver, setDetailsCaregiver] = useState(null);

  useEffect(() => {
    const syncCurrentUser = () => {
      const storedUser = localStorage.getItem("loggedUser");
      setCurrentUser(storedUser ? JSON.parse(storedUser) : null);
    };
    window.addEventListener("storage", syncCurrentUser);
    window.addEventListener("auth-changed", syncCurrentUser);
    return () => {
      window.removeEventListener("storage", syncCurrentUser);
      window.removeEventListener("auth-changed", syncCurrentUser);
    };
  }, []);

  const handleEmergencyClick = async () => {
    if (!currentUser) {
      setShowLogin(true);
      return;
    }

    if (currentUser.role !== "careseeker") {
      showPopup({
        type: "warning",
        title: "Careseeker access only",
        message: "Only careseekers can send emergency care requests."
      });
      return;
    }

    setLoading(true);
    setContactCaregiverId(null);

    try {
      const res = await fetch("http://localhost:5001/api/caregivers/emergency-available");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load emergency caregivers");
      setAllCaregivers(data);
      setShowCaregivers(true);
    } catch (error) {
      console.error(error);
      showPopup({ type: "error", title: "Failed", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Filter by selected district
  const filteredCaregivers = selectedDistrict
    ? allCaregivers.filter((cg) =>
        (cg.district || "").toLowerCase() === selectedDistrict.toLowerCase()
      )
    : allCaregivers;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F]">
      <Navbar
        onFindCaregiver={() => setShowFindCaregiver(true)}
        onBecomeCaregiver={() => setShowBecomeCaregiver(true)}
        onLogin={() => setShowLogin(true)}
      />

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onLoginSuccess={(user) => { setCurrentUser(user); setShowLogin(false); }}
          openFindCaregiver={() => { setShowLogin(false); setShowFindCaregiver(true); }}
          openBecomeCaregiver={() => { setShowLogin(false); setShowBecomeCaregiver(true); }}
        />
      )}
      {showFindCaregiver && <FindCaregiver onClose={() => setShowFindCaregiver(false)} />}
      {showBecomeCaregiver && <BecomeCaregiver onClose={() => setShowBecomeCaregiver(false)} />}

      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-8">

        {/* Before click — only the big button centered */}
        {!showCaregivers && (
          <div className="text-center">
            <button
              onClick={handleEmergencyClick}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-lg text-2xl font-bold disabled:opacity-60"
            >
              {loading ? "Loading..." : "🚨 Emergency Care Request"}
            </button>

            {!currentUser && (
              <p className="text-sm text-slate-500 mt-4">
                Please log in as a careseeker to use emergency care.
              </p>
            )}
          </div>
        )}

        {/* After click — two column layout */}
        {showCaregivers && (
          <div className="flex flex-col lg:flex-row gap-6 max-w-5xl w-full">

            {/* Left panel — district filter only */}
            <div className="w-full lg:w-64 flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter by District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setContactCaregiverId(null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">All Districts</option>
                  {districtOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {selectedDistrict && (
                  <button
                    onClick={() => setSelectedDistrict("")}
                    className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {/* Right panel — caregiver list */}
            <div className="flex-1 bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-center font-bold text-red-600 mb-4 text-base">
                Available Emergency Caregivers
              </h3>

              {filteredCaregivers.length === 0 && (
                <p className="text-center text-gray-500 text-sm">
                  {selectedDistrict
                    ? `No emergency caregivers available in ${selectedDistrict}.`
                    : "No caregivers are currently available in emergency mode."}
                </p>
              )}

              {filteredCaregivers.length > 0 && (
                <div className="space-y-3">
                  {filteredCaregivers.map((caregiver) => (
                    <div
                      key={caregiver._id}
                      className="bg-red-50 border border-red-100 rounded-lg p-3 sm:p-4 flex flex-col gap-2"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <p className="font-bold text-sm sm:text-base">{caregiver.fullName}</p>
                          <p className="text-xs text-gray-600">
                            District: {caregiver.district || "Not specified"}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                          <button
                            onClick={() => setDetailsCaregiver(caregiver)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto shrink-0"
                          >
                            More Details
                          </button>
                          <button
                            onClick={() =>
                              setContactCaregiverId(
                                contactCaregiverId === caregiver._id ? null : caregiver._id
                              )
                            }
                            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto shrink-0"
                          >
                            {contactCaregiverId === caregiver._id ? "Hide Contact" : "Contact Now"}
                          </button>
                        </div>
                      </div>

                      {/* Contact panel */}
                      {contactCaregiverId === caregiver._id && (
                        <div className="bg-white border border-sky-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Caregiver Mobile Number</p>
                            <p className="text-lg font-bold text-slate-800">
                              {caregiver.mobile || "Mobile number not provided"}
                            </p>
                          </div>
                          {caregiver.mobile && (
                            <a
                              href={`tel:${caregiver.mobile}`}
                              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold w-full sm:w-auto"
                            >
                              📞 Call {caregiver.fullName}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CaregiverDetailsModal
        caregiver={detailsCaregiver}
        onClose={() => setDetailsCaregiver(null)}
      />

      <Footer />
    </div>
  );
}

export default Emergency;
