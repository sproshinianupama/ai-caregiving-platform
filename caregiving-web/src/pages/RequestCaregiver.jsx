import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LeafletMap from "../components/LeafletMap";
import FindCaregiver from "./FindCaregiver";
import BecomeCaregiver from "./BecomeCaregiver";
import Login from "./Login";
import { enrichCaregiverMatches } from "../lib/caregiverMatch";
import { showPopup } from "../lib/popup";

const MAX_DAYS = 3;
const MAX_SLOTS_PER_DAY = 4;

// ─── Single Day Row inside AvailabilityPicker ────────────────────────────────
function DayRow({ caregiverId, dayEntry, onDateChange, onToggleSlot, onRemove, showRemove }) {
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevDate = useRef(null);

  const toDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const todayStr = toDateStr(new Date());

  useEffect(() => {
    if (!dayEntry.date) { setScheduleSlots([]); return; }
    if (prevDate.current === dayEntry.date) return;
    prevDate.current = dayEntry.date;
    setLoading(true);
    fetch(`http://localhost:5001/api/schedules/${caregiverId}?date=${dayEntry.date}`)
      .then((r) => r.json())
      .then((data) => setScheduleSlots(Array.isArray(data.slots) ? data.slots : []))
      .catch(() => setScheduleSlots([]))
      .finally(() => setLoading(false));
  }, [dayEntry.date, caregiverId]);

  const isDisabled = (status) =>
    status === "Booked" || status === "Unavailable" || status === "Manual Booking" || status === "Cancelled";

  const slotColor = (slot) => {
    const disabled = isDisabled(slot.status);
    const selected = dayEntry.slots.includes(slot.time);
    if (disabled) return "bg-red-100 text-red-700 border-red-300 cursor-not-allowed opacity-60";
    if (selected) return "bg-blue-600 text-white border-blue-700 font-bold cursor-pointer";
    return "bg-green-100 text-green-700 border-green-300 cursor-pointer hover:bg-green-200";
  };

  const selectedCount = dayEntry.slots.length;

  return (
    <div className="border border-blue-200 rounded-lg p-2 bg-white mb-2">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="date"
          min={todayStr}
          value={dayEntry.date || ""}
          onChange={(e) => onDateChange(e.target.value)}
          className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1"
        />
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
            title="Remove this day"
          >
            ✕
          </button>
        )}
      </div>

      {dayEntry.date && (
        <>
          {loading ? (
            <p className="text-[10px] text-gray-400 mb-1">Loading slots...</p>
          ) : scheduleSlots.length === 0 ? (
            <p className="text-[10px] text-gray-400 mb-1">No slots for this date.</p>
          ) : (
            <>
              <p className="text-[10px] text-gray-500 mb-1">
                Pick up to {MAX_SLOTS_PER_DAY} slots ({selectedCount}/{MAX_SLOTS_PER_DAY} selected):
              </p>
              <div className="flex flex-wrap gap-1 mb-1">
                {scheduleSlots.map((slot) => {
                  const disabled = isDisabled(slot.status);
                  const selected = dayEntry.slots.includes(slot.time);
                  const maxReached = !selected && selectedCount >= MAX_SLOTS_PER_DAY;
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      disabled={disabled || maxReached}
                      onClick={() => !disabled && !maxReached && onToggleSlot(slot.time)}
                      className={`text-[10px] border rounded px-2 py-0.5 transition-all
                        ${slotColor(slot)}
                        ${maxReached && !selected ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                      title={disabled ? slot.status : selected ? "Click to deselect" : maxReached ? `Max ${MAX_SLOTS_PER_DAY} slots` : "Click to select"}
                    >
                      {slot.time}
                      <span className="ml-1 text-[9px]">
                        {disabled ? (slot.status === "Cancelled" ? "🟡" : "🔴") : selected ? "✓" : "🟢"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-[9px] text-gray-400">
                <span>🟢 Free</span><span>✓ Selected</span><span>🔴 Booked/Unavailable</span><span>🟡 Cancelled</span>
              </div>
            </>
          )}
          {dayEntry.slots.length > 0 && (
            <p className="text-[10px] text-blue-700 font-semibold mt-1">
              ✅ {dayEntry.date}: {dayEntry.slots.join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Availability Picker ────────────────────────────────────────────────────
function AvailabilityPicker({ caregiverId, dayEntries, onDayEntriesChange, bookingError }) {
  const toDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const addDay = () => {
    if (dayEntries.length >= MAX_DAYS) return;
    onDayEntriesChange([...dayEntries, { date: "", slots: [] }]);
  };

  const removeDay = (idx) => {
    onDayEntriesChange(dayEntries.filter((_, i) => i !== idx));
  };

  const updateDate = (idx, date) => {
    const next = dayEntries.map((d, i) => i === idx ? { ...d, date, slots: [] } : d);
    onDayEntriesChange(next);
  };

  const toggleSlot = (idx, slotTime) => {
    const entry = dayEntries[idx];
    const alreadySelected = entry.slots.includes(slotTime);
    const newSlots = alreadySelected
      ? entry.slots.filter((s) => s !== slotTime)
      : [...entry.slots, slotTime];
    const next = dayEntries.map((d, i) => i === idx ? { ...d, slots: newSlots } : d);
    onDayEntriesChange(next);
  };

  // Total selected slots across all days
  const totalSelected = dayEntries.reduce((sum, d) => sum + d.slots.length, 0);

  return (
    <div className="mt-3 border-t border-blue-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-blue-800">📅 Check Availability &amp; Pick Times</p>
        <span className="text-[10px] text-gray-500">Max {MAX_DAYS} days · {MAX_SLOTS_PER_DAY} slots/day</span>
      </div>

      {dayEntries.map((entry, idx) => (
        <DayRow
          key={idx}
          caregiverId={caregiverId}
          dayEntry={entry}
          onDateChange={(date) => updateDate(idx, date)}
          onToggleSlot={(slot) => toggleSlot(idx, slot)}
          onRemove={() => removeDay(idx)}
          showRemove={dayEntries.length > 1}
        />
      ))}

      {dayEntries.length < MAX_DAYS && (
        <button
          type="button"
          onClick={addDay}
          className="text-[11px] text-blue-600 border border-blue-300 rounded px-3 py-1 hover:bg-blue-50 mt-1"
        >
          + Add another day
        </button>
      )}

      {totalSelected > 0 && (
        <p className="text-[11px] text-blue-700 font-semibold mt-2">
          ✅ {totalSelected} slot{totalSelected > 1 ? "s" : ""} selected across {dayEntries.filter(d => d.slots.length > 0).length} day{dayEntries.filter(d => d.slots.length > 0).length > 1 ? "s" : ""}
        </p>
      )}

      {bookingError && (
        <p className="text-[11px] text-red-600 font-semibold mt-1">{bookingError}</p>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function RequestCaregiver() {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("loggedUser");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [showFindCaregiver, setShowFindCaregiver] = useState(false);
  const [showBecomeCaregiver, setShowBecomeCaregiver] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [matches, setMatches] = useState([]);
  const [careseekerLocation, setCareseekerLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Detect your location to sort caregivers by distance, or search by city without it.");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [formError, setFormError] = useState("");

  // Per-caregiver availability state: { [caregiverId]: { dayEntries: [{date, slots[]}], error, booking } }
  const [availability, setAvailability] = useState({});

  const [filters, setFilters] = useState({
    careType: "",
    city: "",
    yourName: "",
    address: "",
    mobileNumber: "",
    careRecipientName: "",
    careRecipientAge: "",
    specialCareNeeds: "",
    emergencyCases: "0",
  });

  const mapCaregivers = matches
    .filter((caregiver) => caregiver.latitude && caregiver.longitude)
    .map((caregiver) => ({
      _id: caregiver._id,
      name: caregiver.fullName,
      lat: caregiver.latitude,
      lng: caregiver.longitude,
      distanceKm: caregiver.distanceKm,
    }));

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

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const validateRequestDetails = () => {
    if (
      !filters.careType ||
      !filters.city ||
      !filters.yourName ||
      !filters.address ||
      !filters.mobileNumber ||
      !filters.careRecipientName ||
      !filters.careRecipientAge ||
      !filters.specialCareNeeds ||
      filters.emergencyCases === ""
    ) {
      return "Please fill all details before finding matched caregivers.";
    }

    return "";
  };

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
          ? "Backend route not found. Restart the backend server so the new /api/requests routes are loaded."
          : text || "Server returned a non-JSON response."
    };
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported in this browser.");
      return;
    }

    setLocationStatus("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };

        setCareseekerLocation(nextLocation);
        setFormError("");
        setLocationStatus("Location detected. Caregivers will now be sorted by nearest distance.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("Location permission was denied. You can still search caregivers by city and send requests.");
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus("Location is unavailable right now. You can still search caregivers by city.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationStatus("Location request timed out. You can still search by city without it.");
          return;
        }

        setLocationStatus("Location could not be detected. You can still search caregivers by city.");
      }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleSearch = async () => {
    const validationMessage = validateRequestDetails();

    if (validationMessage) {
      setFormError(validationMessage);
      setMatches([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setFormError("");
    setAvailability({}); // reset availability picks on new search

    try {
      const params = new URLSearchParams();

      if (filters.city) {
        params.set("city", filters.city);
      }

      if (filters.careType) {
        params.set("careType", filters.careType);
      }

      if (filters.specialCareNeeds) {
        params.set("specialCareNeeds", filters.specialCareNeeds);
      }

      if (filters.careRecipientAge) {
        params.set("careRecipientAge", filters.careRecipientAge);
      }

      if (filters.emergencyCases !== "") {
        params.set("emergencyCases", filters.emergencyCases);
      }

      if (careseekerLocation) {
        params.set("latitude", careseekerLocation.lat);
        params.set("longitude", careseekerLocation.lng);
      }

      const queryString = params.toString();
      const url = queryString
        ? `http://localhost:5001/api/requests/caregivers?${queryString}`
        : "http://localhost:5001/api/requests/caregivers";

      const res = await fetch(url);
      const data = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to load caregivers");
      }

      const rankedMatches = enrichCaregiverMatches(Array.isArray(data) ? data : [], filters);
      setMatches(rankedMatches);
      setHasSearched(true);
    } catch (error) {
      console.error(error);
      showPopup({
        type: "error",
        title: "Caregiver search failed",
        message: error.message
      });
    } finally {
      setSearching(false);
    }
  };

  // Helpers to update per-caregiver availability state
  const setAvailDayEntries = (caregiverId, dayEntries) =>
    setAvailability((prev) => ({
      ...prev,
      [caregiverId]: { ...(prev[caregiverId] || {}), dayEntries, error: null },
    }));

  const setAvailError = (caregiverId, error) =>
    setAvailability((prev) => ({
      ...prev,
      [caregiverId]: { ...(prev[caregiverId] || {}), error },
    }));

  const setBooking = (caregiverId, booking) =>
    setAvailability((prev) => ({
      ...prev,
      [caregiverId]: { ...(prev[caregiverId] || {}), booking },
    }));

  const getDayEntries = (caregiverId) =>
    availability[caregiverId]?.dayEntries || [{ date: "", slots: [] }];

  const handleBook = async (caregiver) => {
    if (!currentUser || currentUser.role !== "careseeker") {
      showPopup({
        type: "warning",
        title: "Login required",
        message: "Please log in as a careseeker to send a request."
      });
      return;
    }

    const validationMessage = validateRequestDetails();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const dayEntries = getDayEntries(caregiver._id);
    // Collect all selected slots across all days
    const selections = [];
    for (const entry of dayEntries) {
      for (const slot of entry.slots) {
        selections.push({ date: entry.date, slot });
      }
    }

    if (selections.length === 0) {
      setAvailError(caregiver._id, "Please select at least one date and time slot before booking.");
      return;
    }

    setBooking(caregiver._id, true);

    try {
      // Send one request per selected slot
      const results = await Promise.allSettled(
        selections.map(({ date, slot }) => {
          const [startTime] = slot.split(" - ");
          const serviceDate = new Date(`${date} ${startTime}`);
          return fetch("http://localhost:5001/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caregiverId: caregiver._id,
              careseekerUsername: currentUser.username,
              careType: filters.careType,
              city: caregiver.city || filters.city,
              mobileNumber: filters.mobileNumber,
              address: filters.address,
              careRecipientName: filters.careRecipientName,
              careRecipientAge: filters.careRecipientAge,
              specialCareNeeds: filters.specialCareNeeds,
              emergencyCases: filters.emergencyCases,
              serviceDate: serviceDate.toISOString(),
            }),
          });
        })
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      const sent = results.length - failed;

      if (sent > 0) {
        showPopup({
          type: "success",
          title: "Requests sent! 🎉",
          message: `${sent} booking request${sent > 1 ? "s" : ""} sent to ${caregiver.fullName}.${failed > 0 ? ` (${failed} failed)` : ""}`
        });
        // Reset this caregiver's selections
        setAvailability((prev) => ({
          ...prev,
          [caregiver._id]: { dayEntries: [{ date: "", slots: [] }], error: null, booking: false },
        }));
      } else {
        showPopup({ type: "error", title: "Request not sent", message: "All requests failed. Please try again." });
      }
    } catch (error) {
      console.error(error);
      showPopup({ type: "error", title: "Request not sent", message: error.message });
    } finally {
      setBooking(caregiver._id, false);
    }
  };

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
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setShowLogin(false);
          }}
          openFindCaregiver={() => {
            setShowLogin(false);
            setShowFindCaregiver(true);
          }}
          openBecomeCaregiver={() => {
            setShowLogin(false);
            setShowBecomeCaregiver(true);
          }}
        />
      )}

      {showFindCaregiver && (
        <FindCaregiver onClose={() => setShowFindCaregiver(false)} />
      )}

      {showBecomeCaregiver && (
        <BecomeCaregiver onClose={() => setShowBecomeCaregiver(false)} />
      )}

      <div className="flex flex-col lg:flex-row flex-1 gap-4 sm:gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white w-full lg:w-1/3 rounded-xl shadow-lg p-4 sm:p-6 text-sm">
          <h3 className="text-center font-bold text-green-600 mb-4">
            Search / Filters
          </h3>

          <div className="space-y-3">
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <p className="font-semibold text-blue-800">Your Location</p>
              <p className="text-xs text-gray-600 mt-1">{locationStatus}</p>
              <button
                type="button"
                onClick={detectLocation}
                className="bg-blue-600 text-white px-4 py-2 rounded-md mt-3"
              >
                Detect My Location
              </button>
              <p className="text-[11px] text-gray-500 mt-2">
                If location access fails, fill the city and continue. The list will be filtered by city instead of distance.
              </p>
            </div>

            <select
              name="careType"
              value={filters.careType}
              onChange={handleChange}
              className="w-full border p-1 rounded"
            >
              <option value="">Care Type</option>
              <option value="Childcare">Childcare</option>
              <option value="Eldercare">Eldercare</option>
              <option value="Disabled Care">Disabled Care</option>
            </select>

            <input
              name="city"
              value={filters.city}
              placeholder="City (eg: Colombo)"
              onChange={handleChange}
              className="w-full border p-1 rounded"
            />

            <input
              name="yourName"
              value={filters.yourName}
              placeholder="Your Name"
              onChange={handleChange}
              className="w-full border-b"
            />
            <input
              name="address"
              value={filters.address}
              placeholder="Address"
              onChange={handleChange}
              className="w-full border-b"
            />
            <input
              name="mobileNumber"
              value={filters.mobileNumber}
              placeholder="Mobile Number"
              onChange={handleChange}
              className="w-full border-b"
            />
            <input
              name="careRecipientName"
              value={filters.careRecipientName}
              placeholder="Care Recipient Name"
              onChange={handleChange}
              className="w-full border-b"
            />
            <input
              name="careRecipientAge"
              value={filters.careRecipientAge}
              placeholder="Care Recipient Age"
              onChange={handleChange}
              className="w-full border-b"
            />
            <input
              name="specialCareNeeds"
              value={filters.specialCareNeeds}
              placeholder="Special care needs"
              onChange={handleChange}
              className="w-full border-b"
            />
            <input
              type="number"
              min="0"
              max="10"
              name="emergencyCases"
              value={filters.emergencyCases}
              placeholder="Emergency cases"
              onChange={handleChange}
              className="w-full border-b"
            />

            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-blue-600 text-white w-full py-2 rounded-full mt-4 disabled:opacity-60"
            >
              {searching ? "Searching..." : "Find Best Matched Caregivers"}
            </button>

            {formError && (
              <p className="text-red-600 text-xs text-center">{formError}</p>
            )}
          </div>
        </div>

        <div className="bg-white w-full lg:w-1/2 rounded-xl shadow-lg p-4 sm:p-6 text-sm">
          <h3 className="text-center font-bold text-green-600 mb-4">
            Best Matched Caregivers
          </h3>

          {matches.length === 0 && (
            <p className="text-center text-gray-500 text-xs">
              {hasSearched
                ? "No caregivers matched your care type, city, or special needs."
                : "Fill the form and click Find Best Matched Caregivers. Location is optional but improves ranking."}
            </p>
          )}

          {matches.map((caregiver) => {
            const avail = availability[caregiver._id] || {};
            return (              <div
                key={caregiver._id}
                className="bg-blue-50 rounded p-3 mb-3"
              >
                {/* Top row: info + Book button */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{caregiver.fullName}</p>
                      <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                        Match {caregiver.matchScore ?? 0}%
                      </span>
                      {caregiver.avgRating !== null && caregiver.avgRating !== undefined ? (
                        <span className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${
                                star <= Math.round(caregiver.avgRating)
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="text-[10px] text-gray-500 ml-1">
                            {caregiver.avgRating.toFixed(1)} ({caregiver.totalRatings} review{caregiver.totalRatings !== 1 ? "s" : ""})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">No ratings yet</span>
                      )}
                    </div>
                    <p className="text-xs">
                      {caregiver.city || "No city"} | {caregiver.district || "No district"}
                    </p>
                    <p className="text-xs">@{caregiver.username}</p>
                    {caregiver.careTypes?.length > 0 && (
                      <p className="text-xs mt-1">
                        Care types: {caregiver.careTypes.join(", ")}
                      </p>
                    )}
                    {caregiver.experienceYears > 0 && (
                      <p className="text-xs">
                        Experience: {caregiver.experienceYears} year(s)
                      </p>
                    )}
                    {caregiver.distanceKm !== null && caregiver.distanceKm !== undefined && (
                      <p className="text-xs text-blue-700 mt-1">
                        Distance: {caregiver.distanceKm} km
                      </p>
                    )}
                    {caregiver.matchReasons?.length > 0 && (
                      <ul className="text-[11px] text-gray-700 mt-2 list-disc pl-4 space-y-0.5">
                        {caregiver.matchReasons.map((reason) => (
                          <li key={`${caregiver._id}-${reason}`}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    onClick={() => handleBook(caregiver)}
                    disabled={avail.booking}
                    className="bg-sky-400 px-3 py-1 rounded text-xs shrink-0 disabled:opacity-60"
                  >
                    {avail.booking ? "Sending..." : "Book"}
                  </button>
                </div>

                {/* Availability Picker — below the info */}
                <AvailabilityPicker
                  caregiverId={caregiver._id}
                  dayEntries={getDayEntries(caregiver._id)}
                  onDayEntriesChange={(entries) => setAvailDayEntries(caregiver._id, entries)}
                  bookingError={availability[caregiver._id]?.error || null}
                />
              </div>
            );
          })}
        </div>

        <div className="bg-white w-full lg:w-1/6 rounded-xl shadow-lg p-2 min-h-[260px] sm:min-h-[360px]">
          <LeafletMap
            caregivers={mapCaregivers}
            careseekerLocation={careseekerLocation}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default RequestCaregiver;
