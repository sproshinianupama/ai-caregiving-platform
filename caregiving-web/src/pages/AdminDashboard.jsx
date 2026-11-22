import { useEffect, useState } from "react";

import AdminNavbar from "../components/AdminNavbar";
import Footer from "../components/Footer";
import { apiFetch, buildUploadUrl } from "../lib/api";
import { useLanguage } from "../lib/language";

// ── Caregiver Detail Modal ───────────────────────────────────────────────────
function CaregiverReviewModal({ item, onClose, onApprove, onReject, acting }) {
  if (!item) return null;

  const docs = item.documents || {};
  const nicFiles = Array.isArray(docs.nicFile) ? docs.nicFile : (docs.nicFile ? [docs.nicFile] : []);
  const certificates = Array.isArray(docs.certificates) ? docs.certificates : (docs.certificates ? [docs.certificates] : []);
  const policeReport = docs.policeReport || null;
  const profilePhoto = docs.profilePhoto || null;

  const isImg = (f) => /\.(png|jpe?g|gif|webp)$/i.test(f || "");

  const fields = [
    ["Full Name",    item.fullName],
    ["Username",     item.username],
    ["NIC",          item.nic],
    ["Email",        item.email],
    ["Mobile",       item.mobile],
    ["District",     item.district],
    ["City",         item.city],
    ["Address",      item.address],
    ["Registered On", new Date(item.createdAt).toLocaleString()],
  ];

  const statusColor = {
    pending:  "bg-yellow-100 text-yellow-700 border-yellow-300",
    approved: "bg-green-100  text-green-700  border-green-300",
    rejected: "bg-red-100    text-red-700    border-red-300",
  }[item.approvalStatus || "pending"];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-bold text-lg text-blue-900">Caregiver Review</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-5 text-sm">

          {/* Photo + status */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0 shadow">
              {profilePhoto ? (
                <img src={buildUploadUrl(profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">
                  {(item.fullName || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-blue-900 text-base">{item.fullName}</p>
              <p className="text-gray-500 text-xs">@{item.username}</p>
              <span className={`inline-block mt-1 text-[11px] border px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                {(item.approvalStatus || "pending").charAt(0).toUpperCase() + (item.approvalStatus || "pending").slice(1)}
              </span>
            </div>
          </div>

          {/* Details */}
          <div>
            <p className="font-semibold text-blue-800 mb-2 border-b pb-1">Registration Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {fields.map(([label, value]) => (
                <p key={label}><span className="font-medium text-gray-600">{label}:</span> {value || "—"}</p>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <p className="font-semibold text-blue-800 mb-2 border-b pb-1">Documents & Certificates</p>
            <div className="flex flex-wrap gap-3">
              {nicFiles.map((f, i) => (
                <div key={`nic-${i}`} className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">NIC {nicFiles.length > 1 ? i + 1 : ""}</p>
                  {isImg(f)
                    ? <img src={buildUploadUrl(f)} alt="NIC" className="w-24 h-16 object-cover rounded border" />
                    : <a href={buildUploadUrl(f)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">Open NIC</a>}
                </div>
              ))}
              {policeReport && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">Police Report</p>
                  {isImg(policeReport)
                    ? <img src={buildUploadUrl(policeReport)} alt="Police" className="w-24 h-16 object-cover rounded border" />
                    : <a href={buildUploadUrl(policeReport)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">Open Report</a>}
                </div>
              )}
              {certificates.map((f, i) => (
                <div key={`cert-${i}`} className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">Certificate {certificates.length > 1 ? i + 1 : ""}</p>
                  {isImg(f)
                    ? <img src={buildUploadUrl(f)} alt="Cert" className="w-24 h-16 object-cover rounded border" />
                    : <a href={buildUploadUrl(f)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">Open Certificate</a>}
                </div>
              ))}
              {nicFiles.length === 0 && !policeReport && certificates.length === 0 && (
                <p className="text-gray-400 text-xs">No documents uploaded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {item.approvalStatus !== "approved" && (
            <button
              onClick={onApprove}
              disabled={acting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-semibold disabled:opacity-60"
            >
              {acting === "approved" ? "Approving..." : "✓ Accept"}
            </button>
          )}
          {item.approvalStatus !== "rejected" && (
            <button
              onClick={onReject}
              disabled={acting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-semibold disabled:opacity-60"
            >
              {acting === "rejected" ? "Rejecting..." : "✕ Reject"}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-xl font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { t } = useLanguage();
  const [dashboard, setDashboard] = useState({
    summary: {
      totalCaregivers: 0,
      totalCareseekers: 0,
      newRegistrationsToday: 0,
      emergencyRequestsToday: 0
    },
    recentRegistrations: [],
    allCaregiverRegistrations: [],
    recentRequests: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewItem, setReviewItem] = useState(null);   // caregiver item open in modal
  const [acting, setActing] = useState(null);           // "approved" | "rejected" | null

  const loadDashboard = async (isMounted, setLoading_) => {
    try {
      const data = await apiFetch("/api/admin/dashboard");
      if (isMounted()) {
        setDashboard(data);
        setError("");
        if (setLoading_) setLoading_(false);
      }
    } catch (loadError) {
      if (isMounted()) {
        setError(loadError.message);
        if (setLoading_) setLoading_(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    loadDashboard(isMounted, setLoading);
    const intervalId = window.setInterval(() => loadDashboard(isMounted, null), 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleApproval = async (status) => {
    if (!reviewItem) return;
    setActing(status);
    try {
      await apiFetch(`/api/admin/caregivers/${reviewItem.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      // Update the item in both lists immediately
      const patchList = (list) =>
        list.map((r) => r.id === reviewItem.id ? { ...r, approvalStatus: status } : r);
      setReviewItem((prev) => ({ ...prev, approvalStatus: status }));
      setDashboard((prev) => ({
        ...prev,
        recentRegistrations: patchList(prev.recentRegistrations),
        allCaregiverRegistrations: patchList(prev.allCaregiverRegistrations),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  };

  const statCards = [
    {
      label: t("totalCaregivers"),
      value: dashboard.summary.totalCaregivers,
      valueClassName: "text-blue-600"
    },
    {
      label: t("totalCareseekers"),
      value: dashboard.summary.totalCareseekers,
      valueClassName: "text-blue-600"
    },
    {
      label: t("newRegistrationsToday"),
      value: dashboard.summary.newRegistrationsToday,
      valueClassName: "text-yellow-500"
    },
    {
      label: t("emergencyRequestsToday"),
      value: dashboard.summary.emergencyRequestsToday,
      valueClassName: "text-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <AdminNavbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10">
        <div className="flex flex-col gap-2 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2F2F2F] via-[#1A85C6] to-[#6D9043] bg-clip-text text-transparent">
            {t("adminDashboardOverview")}
          </h2>
          <p className="text-sm text-[#2F2F2F]">
            {t("liveRefresh15s")}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl p-6 shadow-lg text-center"
            >
              <h3 className="text-lg font-semibold text-gray-700">
                {card.label}
              </h3>
              <p className={`text-3xl font-bold mt-2 ${card.valueClassName}`}>
                {loading ? "..." : card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-blue-600">
              {t("latestRegistrations")}
            </h3>

            <div className="space-y-3 text-gray-700">
              {!loading && dashboard.recentRegistrations.length === 0 && (
                <p>{t("noRegistrationsYet")}</p>
              )}

              {dashboard.recentRegistrations.map((item) => (
                <div
                  key={`recent-${item.role}-${item.id}`}
                  className="border border-blue-100 rounded-lg p-3"
                >
                  <p className="font-semibold">
                    {item.fullName}{" "}
                    <span className="text-xs text-gray-400">({item.role})</span>
                  </p>
                  <p className="text-sm">
                    @{item.username} {item.city ? `- ${item.city}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("joined")} {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Caregiver Approvals — all caregivers ── */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-1 text-blue-600">Caregiver Approvals</h3>
            <p className="text-xs text-gray-500 mb-4">
              All registered caregivers — review and approve or reject each one.
            </p>

            <div className="space-y-3 text-gray-700">
              {!loading && dashboard.allCaregiverRegistrations.length === 0 && (
                <p className="text-sm text-gray-400">No caregivers registered yet.</p>
              )}

              {dashboard.allCaregiverRegistrations.map((item) => {
                const status = item.approvalStatus || "pending";
                const statusStyle = {
                  pending:  "bg-yellow-100 text-yellow-700 border-yellow-300",
                  approved: "bg-green-100  text-green-700  border-green-300",
                  rejected: "bg-red-100    text-red-700    border-red-300",
                }[status];

                const patchAll = (s) => {
                  setDashboard((prev) => ({
                    ...prev,
                    recentRegistrations: prev.recentRegistrations.map((r) =>
                      r.id === item.id ? { ...r, approvalStatus: s } : r
                    ),
                    allCaregiverRegistrations: prev.allCaregiverRegistrations.map((r) =>
                      r.id === item.id ? { ...r, approvalStatus: s } : r
                    ),
                  }));
                };

                return (
                  <div
                    key={`approval-${item.id}`}
                    className="border border-blue-100 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold">{item.fullName}</p>
                        <p className="text-sm text-gray-600">
                          @{item.username} {item.city ? `· ${item.city}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("joined")} {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-[11px] border px-2 py-0.5 rounded-full font-medium shrink-0 ${statusStyle}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => setReviewItem(item)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full"
                      >
                        See More
                      </button>
                      {status !== "approved" && (
                        <button
                          onClick={async () => {
                            setActing("approved");
                            try {
                              await apiFetch(`/api/admin/caregivers/${item.id}/approval`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "approved" }),
                              });
                              patchAll("approved");
                            } catch (err) { setError(err.message); }
                            finally { setActing(null); }
                          }}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full"
                        >
                          Accept
                        </button>
                      )}
                      {status !== "rejected" && (
                        <button
                          onClick={async () => {
                            setActing("rejected");
                            try {
                              await apiFetch(`/api/admin/caregivers/${item.id}/approval`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "rejected" }),
                              });
                              patchAll("rejected");
                            } catch (err) { setError(err.message); }
                            finally { setActing(null); }
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-blue-600">
              {t("recentRequestActivity")}
            </h3>

            <div className="space-y-3 text-gray-700">
              {!loading && dashboard.recentRequests.length === 0 && (
                <p>{t("noRequestActivityYet")}</p>
              )}

              {dashboard.recentRequests.map((item) => (
                <div
                  key={item.id}
                  className="border border-blue-100 rounded-lg p-3"
                >
                  <p className="font-semibold">
                    {item.careseekerName} to {item.caregiverName}
                  </p>
                  <p className="text-sm">
                    {item.city || t("notProvided")} - {t("status")}: {item.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("emergencyCases")}: {item.emergencyCases} -{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CaregiverReviewModal
        item={reviewItem}
        onClose={() => setReviewItem(null)}
        onApprove={() => handleApproval("approved")}
        onReject={() => handleApproval("rejected")}
        acting={acting}
      />

      <Footer />
    </div>
  );
}

export default AdminDashboard;
