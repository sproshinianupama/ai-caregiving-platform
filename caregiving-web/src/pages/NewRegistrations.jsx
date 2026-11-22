import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";

import AdminNavbar from "../components/AdminNavbar";
import Footer from "../components/Footer";
import { apiFetch, buildUploadUrl } from "../lib/api";
import { useLanguage } from "../lib/language";
import { showConfirm, showPopup } from "../lib/popup";

function NewRegistrations() {
  const { t } = useLanguage();
  const [registrations, setRegistrations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadRegistrations = async () => {
      try {
        const data = await apiFetch("/api/admin/registrations");

        if (isMounted) {
          setRegistrations(data);
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

    loadRegistrations();
    const intervalId = window.setInterval(loadRegistrations, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const toggleDetails = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getItemKey = (item) => `${item.role}-${item.id}`;

  const startEdit = (item) => {
    setEditingId(getItemKey(item));
    setExpandedId(item.id);
    setEditForm({
      fullName: item.fullName || "",
      username: item.username || "",
      nic: item.nic || "",
      email: item.email || "",
      mobile: item.mobile || "",
      district: item.district || "",
      city: item.city || "",
      address: item.address || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveRegistration = async (item) => {
    const itemKey = getItemKey(item);

    try {
      setSavingId(itemKey);
      const updatedRegistration = await apiFetch(`/api/admin/registrations/${item.role}/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });

      setRegistrations((currentRegistrations) =>
        currentRegistrations.map((registration) =>
          getItemKey(registration) === itemKey ? updatedRegistration : registration
        )
      );
      cancelEdit();
      setError("");
      showPopup({
        type: "success",
        title: "Registration updated",
        message: "The registration details were saved successfully."
      });
    } catch (saveError) {
      setError(saveError.message);
      showPopup({
        type: "error",
        title: "Update failed",
        message: saveError.message
      });
    } finally {
      setSavingId(null);
    }
  };

  const deleteRegistration = async (item) => {
    const confirmed = await showConfirm({
      title: "Permanent delete",
      message: "you sure to delete this registration permenently",
      confirmText: "Delete",
      cancelText: "Keep"
    });

    if (!confirmed) {
      return;
    }

    const itemKey = getItemKey(item);

    try {
      setDeletingId(itemKey);
      await apiFetch(`/api/admin/registrations/${item.role}/${item.id}`, {
        method: "DELETE"
      });

      setRegistrations((currentRegistrations) =>
        currentRegistrations.filter((registration) => getItemKey(registration) !== itemKey)
      );

      if (editingId === itemKey) {
        cancelEdit();
      }

      setError("");
      showPopup({
        type: "success",
        title: "Registration deleted",
        message: "The registration was permanently deleted from the database."
      });
    } catch (deleteError) {
      setError(deleteError.message);
      showPopup({
        type: "error",
        title: "Delete failed",
        message: deleteError.message
      });
    } finally {
      setDeletingId(null);
    }
  };

  const isPreviewableImage = (filename) =>
    /\.(png|jpe?g|gif|webp)$/i.test(filename || "");

  const renderDocumentPreview = (label, filename) => {
    if (!filename) {
      return null;
    }

    const fileUrl = buildUploadUrl(filename);

    return (
      <div>
        <p className="font-semibold mb-2">{label}</p>
        {isPreviewableImage(filename) ? (
          <img
            src={fileUrl}
            alt={label}
            className="w-32 h-24 object-cover rounded-md cursor-pointer border"
            onClick={() => setPreviewImage(fileUrl)}
          />
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline"
          >
            {t("openDocument")}
          </a>
        )}
      </div>
    );
  };

  const renderDetailField = (label, fieldName, value, isEditing) => {
    if (isEditing) {
      return (
        <label className="block">
          <strong>{label}:</strong>
          <input
            name={fieldName}
            value={editForm[fieldName] || ""}
            onChange={handleEditChange}
            className="mt-1 w-full border border-blue-200 rounded-md px-3 py-2"
          />
        </label>
      );
    }

    return (
      <p>
        <strong>{label}:</strong> {value || t("notProvided")}
      </p>
    );
  };

  const downloadAsPdf = (item) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(26, 133, 198);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Care AI Sri Lanka", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Registration Details", 14, 20);
    doc.text(`Downloaded on: ${new Date().toLocaleString()}`, 14, 26);

    // Table rows
    const rows = [
      ["Full Name",     item.fullName    || "-"],
      ["Username",      item.username    || "-"],
      ["Role",          item.role        || "-"],
      ["NIC",           item.nic         || "-"],
      ["Email",         item.email       || "-"],
      ["Phone",         item.mobile      || "-"],
      ["District",      item.district    || "-"],
      ["City",          item.city        || "-"],
      ["Address",       item.address     || "-"],
      ["Registered On", item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"]
    ];

    const startY = 38;
    const rowHeight = 12;
    const labelX = 14;
    const valueX = 75;
    const pageWidth = 196;

    rows.forEach(([label, value], index) => {
      const y = startY + index * rowHeight;
      const isEven = index % 2 === 0;

      // Row background
      doc.setFillColor(isEven ? 240 : 255, isEven ? 244 : 255, isEven ? 255 : 255);
      doc.rect(14, y - 7, pageWidth, rowHeight, "F");

      // Border
      doc.setDrawColor(200, 210, 230);
      doc.rect(14, y - 7, pageWidth, rowHeight, "S");

      // Label
      doc.setTextColor(30, 80, 150);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(label, labelX + 2, y);

      // Value
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), valueX, y);
    });

    const safeName = (item.fullName || "Registration").replace(/[^a-z0-9]/gi, "_");
    doc.save(`${safeName}_registration.pdf`);
  };

  const filteredRegistrations = registrations.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (item.fullName || "").toLowerCase().includes(q) ||
      (item.nic || "").toLowerCase().includes(q) ||
      (item.mobile || "").toLowerCase().includes(q) ||
      (item.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <AdminNavbar />

      <div className="flex-1 flex justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl">
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="text-center text-xl font-bold bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white py-2 rounded-md">
              {t("latestPlatformRegistrations")}
            </h2>
            <p className="text-center text-sm text-gray-700">
              {t("thisListRefreshes")}
            </p>
            {/* Search bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, NIC, phone or username..."
              className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-lg p-4 text-center">
              {t("loadingRegistrations")}
            </div>
          )}

          <div className="space-y-6">
            {!loading && filteredRegistrations.length === 0 && (
              <div className="bg-white rounded-lg p-4 text-center">
                {searchQuery ? "No registrations matched your search." : t("noRegistrationsFound")}
              </div>
            )}

            {filteredRegistrations.map((item) => {
              const itemKey = getItemKey(item);
              const isEditing = editingId === itemKey;
              const isSaving = savingId === itemKey;
              const isDeleting = deletingId === itemKey;

              return (
              <div key={itemKey} className="bg-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div>
                    <p className="font-semibold">
                      {item.fullName} - {item.role}
                    </p>
                    <p className="text-sm text-gray-700">
                      @{item.username} {item.city ? `- ${item.city}` : ""}
                    </p>
                    <p className="text-xs text-gray-600">
                      {t("registeredOn")} {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 sm:justify-end">
                    <button
                      onClick={() => toggleDetails(item.id)}
                      className="text-sm text-blue-900 underline text-left md:text-right"
                    >
                      {expandedId === item.id ? t("hideDetails") : t("seeMore")}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => downloadAsPdf(item)}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded-md"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => deleteRegistration(item)}
                      disabled={isDeleting}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded-md disabled:opacity-60"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="mt-4 bg-white p-4 rounded-md text-sm text-gray-700 space-y-2">
                    {renderDetailField(t("fullName"), "fullName", item.fullName, isEditing)}
                    {renderDetailField(t("username"), "username", item.username, isEditing)}
                    <p><strong>{t("role")}:</strong> {item.role}</p>
                    {renderDetailField(t("nic"), "nic", item.nic, isEditing)}
                    {renderDetailField(t("email"), "email", item.email, isEditing)}
                    {renderDetailField(t("phone"), "mobile", item.mobile, isEditing)}
                    {renderDetailField(t("district"), "district", item.district, isEditing)}
                    {renderDetailField(t("city"), "city", item.city, isEditing)}
                    {renderDetailField(t("address"), "address", item.address, isEditing)}

                    {isEditing && (
                      <div className="flex gap-3 pt-3">
                        <button
                          onClick={() => saveRegistration(item)}
                          disabled={isSaving}
                          className="bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-gray-500 text-white px-4 py-2 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {item.role === "caregiver" && item.documents && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {renderDocumentPreview(t("nicDocument"), item.documents.nicFile)}
                        {renderDocumentPreview(t("policeReport"), item.documents.policeReport)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[95vw] sm:max-w-3xl max-h-[80vh] rounded-lg shadow-lg"
          />
        </div>
      )}

      <Footer />
    </div>
  );
}

export default NewRegistrations;
