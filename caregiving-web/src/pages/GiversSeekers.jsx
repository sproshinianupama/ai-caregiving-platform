import { useEffect, useState } from "react";

import AdminNavbar from "../components/AdminNavbar";
import Footer from "../components/Footer";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../lib/language";

function GiversSeekers() {
  const { t } = useLanguage();
  const [caregivers, setCaregivers] = useState([]);
  const [careseekers, setCareseekers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const [caregiverData, careseekerData] = await Promise.all([
          apiFetch("/api/admin/caregivers"),
          apiFetch("/api/admin/careseekers")
        ]);

        if (isMounted) {
          setCaregivers(caregiverData);
          setCareseekers(careseekerData);
          setError("");
          setLoading(false);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
          setLoading(false);
        }
      }
    };

    loadUsers();
    const intervalId = window.setInterval(loadUsers, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const renderUserCard = (item, role) => (
    <div
      key={item._id}
      className="bg-blue-50 p-4 rounded-md space-y-1"
    >
      <p className="font-semibold">
        {item.fullName || item.username}
      </p>
      <p className="text-sm">@{item.username}</p>
      <p className="text-sm">{t("email")}: {item.email || t("notProvided")}</p>
      <p className="text-sm">{t("mobile")}: {item.mobile || t("notProvided")}</p>
      <p className="text-sm">{t("district")}: {item.district || t("notProvided")}</p>
      <p className="text-sm">{t("city")}: {item.city || t("notProvided")}</p>
      <p className="text-sm">{t("address")}: {item.address || t("notProvided")}</p>
      {role === "caregiver" && (
        <p className="text-sm">
          {t("emergencyAvailability")}: {item.emergencyAvailable ? t("on") : t("off")}
        </p>
      )}
      <p className="text-xs text-gray-600">
        {t("joined")} {new Date(item.createdAt).toLocaleString()}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <AdminNavbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 flex gap-6 lg:gap-10 flex-col xl:flex-row">
        {error && (
          <div className="bg-red-100 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        <div className="flex-1 bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-4 py-2 rounded-md font-bold">
              {t("totalCaregivers")} ({loading ? "..." : caregivers.length})
            </h2>
            <span className="text-sm text-gray-700">{t("autoRefresh")}: 15s</span>
          </div>

          <div className="space-y-4">
            {!loading && caregivers.length === 0 && (
              <div className="bg-white p-4 rounded-md">{t("noCaregiversFound")}</div>
            )}
            {caregivers.map((cg) => renderUserCard(cg, "caregiver"))}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-4 py-2 rounded-md font-bold">
              {t("totalCareseekers")} ({loading ? "..." : careseekers.length})
            </h2>
            <span className="text-sm text-gray-700">{t("autoRefresh")}: 15s</span>
          </div>

          <div className="space-y-4">
            {!loading && careseekers.length === 0 && (
              <div className="bg-white p-4 rounded-md">{t("noCareseekersFound")}</div>
            )}
            {careseekers.map((cs) => renderUserCard(cs, "careseeker"))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default GiversSeekers;
