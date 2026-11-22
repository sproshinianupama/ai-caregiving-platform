import { useEffect, useState } from "react";
import CaregiverNavbar from "../components/CaregiverNavbar";
import Footer from "../components/Footer";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// ── Booking Details Modal ────────────────────────────────────────────────────
function BookingDetailsModal({ info, onClose }) {
  if (!info) return null;

  const svcDate = info.serviceDate ? new Date(info.serviceDate) : null;
  const dateStr = svcDate
    ? svcDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const rows = [
    ["📅 Date",              dateStr],
    ["⏰ Time Slot",         info.timeSlot || "—"],
    ["🏥 Care Type",         info.careType || "—"],
    ["📍 City",              info.city || "—"],
    ["🏠 Address",           info.address || "—"],
    ["👤 Careseeker Name",   info.careseekerName || "—"],
    ["📞 Mobile",            info.mobileNumber || "—"],
    ["🧒 Recipient Name",    info.careRecipientName || "—"],
    ["🎂 Recipient Age",     info.careRecipientAge ?? "—"],
    ["💊 Special Care Needs",info.specialCareNeeds || "—"],
    ["🚨 Emergency Cases",   info.emergencyCases ?? 0],
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-blue-800">Booking Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="font-semibold text-gray-600 w-44 shrink-0">{label}:</span>
              <span className="text-gray-800">{String(value)}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function SmartScheduling() {
  const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
  const caregiverId = loggedUser?.id;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [bookingModal, setBookingModal] = useState(null); // holds requestInfo to show in modal

  const selectedDateKey = toDateKey(selectedDate);

  const readApiResponse = async (res) => {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (isJson) {
      return await res.json();
    }

    const text = await res.text();
    return {
      message:
        res.status === 404
          ? "Schedule API route not found. Restart the backend server so the new /api/schedules routes are loaded."
          : text || "Server returned a non-JSON response."
    };
  };

  useEffect(() => {
    const loadSchedule = async () => {
      if (!caregiverId) return;

      setLoading(true);
      setMessage("");

      try {
        const res = await fetch(
          `http://localhost:5001/api/schedules/${caregiverId}?date=${selectedDateKey}`
        );
        const data = await readApiResponse(res);

        if (!res.ok) {
          throw new Error(data.message || "Failed to load schedule");
        }

        setSlots(data.slots || []);
      } catch (error) {
        console.error(error);
        setMessage(error.message);
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [caregiverId, selectedDateKey]);

  const getManualSlots = (nextSlots) =>
    nextSlots
      .filter((slot) => slot.source !== "request")
      .map((slot) => ({
        slotId: slot.slotId,
        time: slot.time,
        status: slot.status,
        notes: slot.notes || ""
      }));

  const saveSchedule = async (nextSlots) => {
    if (!caregiverId) return;

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`http://localhost:5001/api/schedules/${caregiverId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedDateKey,
          slots: getManualSlots(nextSlots)
        }),
      });

      const data = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to save schedule");
      }

      setMessage("Schedule saved successfully.");
      const reloadRes = await fetch(
        `http://localhost:5001/api/schedules/${caregiverId}?date=${selectedDateKey}`
      );
      const reloadData = await readApiResponse(reloadRes);

      if (!reloadRes.ok) {
        throw new Error(reloadData.message || "Failed to reload schedule");
      }

      setSlots(reloadData.slots || []);
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateManualSlots = (updater) => {
    const nextSlots = slots.map((slot) =>
      slot.source === "request" ? slot : updater(slot)
    );
    setSlots(nextSlots);
    return nextSlots;
  };

  const markAllFree = () => {
    const nextSlots = updateManualSlots((slot) => ({ ...slot, status: "Free" }));
    saveSchedule(nextSlots);
  };

  const markAllUnavailable = () => {
    const nextSlots = updateManualSlots((slot) => ({ ...slot, status: "Unavailable" }));
    saveSchedule(nextSlots);
  };

  const addBooking = () => {
    const time = window.prompt("Enter booking time range", "8:00 PM - 10:00 PM");
    if (!time) return;

    const note = window.prompt("Optional note for this manual booking", "") || "";

    const nextSlots = [
      ...slots,
      {
        slotId: `manual-${Date.now()}`,
        time,
        status: "Manual Booking",
        notes: note,
        source: "manual",
        requestInfo: null
      }
    ];

    setSlots(nextSlots);
    saveSchedule(nextSlots);
  };

  const updateSlotStatus = (slotId, nextStatus) => {
    const nextSlots = slots.map((slot) =>
      slot.slotId === slotId && slot.source !== "request"
        ? { ...slot, status: nextStatus }
        : slot
    );
    setSlots(nextSlots);
  };

  const handleSaveCurrentDay = () => {
    saveSchedule(slots);
  };

  const getStatusColor = (slot) => {
    if (slot.status === "Free") return "bg-green-200 text-green-800";
    if (slot.status === "Booked") return "bg-red-200 text-red-800";
    if (slot.status === "Manual Booking") return "bg-blue-200 text-blue-800";
    if (slot.status === "Cancelled") return "bg-gray-300 text-gray-700";
    return "bg-orange-200 text-orange-900";
  };

  const bookedCount = slots.filter((slot) => slot.status === "Booked").length;
  const freeCount = slots.filter((slot) => slot.status === "Free").length;
  const unavailableCount = slots.filter(
    (slot) => slot.status === "Unavailable" || slot.status === "Manual Booking"
  ).length;
  const cancelledCount = slots.filter((slot) => slot.status === "Cancelled").length;
  const workingHours = (bookedCount + unavailableCount) * 2;

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <CaregiverNavbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 flex gap-6 lg:gap-10 flex-col lg:flex-row">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg w-full lg:w-1/2">
          <div className="flex gap-2 sm:gap-4 mb-6 flex-wrap">
            <button
              onClick={addBooking}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              + Add Booking
            </button>

            <button
              onClick={markAllFree}
              className="bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Mark Day Free
            </button>

            <button
              onClick={markAllUnavailable}
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Mark Day Unavailable
            </button>

            <button
              onClick={handleSaveCurrentDay}
              disabled={saving}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>

          <Calendar
            value={selectedDate}
            onChange={setSelectedDate}
          />

          <div className="mt-6 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">
              Daily Summary: {selectedDate.toDateString()}
            </h3>

            <p>Booked Slots: {bookedCount}</p>
            <p>Free Slots: {freeCount}</p>
            <p>Unavailable / Manual Bookings: {unavailableCount}</p>
            <p>Cancelled: {cancelledCount}</p>
            <p>Total Planned Hours: {workingHours} hrs</p>

            {message && (
              <p className="mt-3 text-sm text-blue-700">{message}</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg w-full lg:w-1/2">
          <h2 className="font-bold mb-4">
            {selectedDate.toDateString()}
          </h2>

          {loading ? (
            <p>Loading schedule...</p>
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <div
                  key={slot.slotId}
                  className={`p-3 rounded-lg flex justify-between items-center gap-4 ${getStatusColor(slot)}`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{slot.time}</div>
                    {slot.source === "request" && slot.requestInfo && (
                      <div className="text-xs mt-1">
                        Accepted booking for {slot.requestInfo.careseekerName}
                      </div>
                    )}
                    {slot.notes && (
                      <div className="text-xs mt-1">{slot.notes}</div>
                    )}
                  </div>

                  {slot.source === "request" ? (
                    <button
                      onClick={() => setBookingModal(slot.requestInfo)}
                      className="shrink-0 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Booked
                    </button>
                  ) : (
                    <select
                      value={slot.status}
                      onChange={(e) => updateSlotStatus(slot.slotId, e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm text-slate-800"
                    >
                      <option value="Free">Free</option>
                      <option value="Unavailable">Unavailable</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Manual Booking">Manual Booking</option>
                    </select>
                  )}
                </div>
              ))}

              {slots.length === 0 && (
                <p>No slots available for this date yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <BookingDetailsModal
        info={bookingModal}
        onClose={() => setBookingModal(null)}
      />

      <Footer />
    </div>
  );
}

export default SmartScheduling;
