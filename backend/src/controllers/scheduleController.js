const CaregiverSchedule = require("../models/CaregiverSchedule");
const CareRequest = require("../models/CareRequest");

const DEFAULT_SLOTS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM"
];

const buildDefaultSlots = () =>
  DEFAULT_SLOTS.map((time, index) => ({
    slotId: `default-${index + 1}`,
    time,
    status: "Free",
    notes: ""
  }));

const normalizeManualSlots = (slots) =>
  (Array.isArray(slots) ? slots : []).map((slot, index) => ({
    slotId: slot.slotId || `manual-${index + 1}`,
    time: slot.time,
    status: slot.status,
    notes: slot.notes || ""
  }));

// Format a Date into a 12-hour time string, e.g. "9:00 AM"
const formatTime12h = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const mm = minutes === 0 ? "00" : String(minutes).padStart(2, "0");
  return `${hours}:${mm} ${ampm}`;
};

// Find which manual slot best covers the request's serviceDate time.
// Each slot label is like "8:00 AM - 10:00 AM". We parse the start time
// and pick the slot whose start time is <= serviceDate time < end time.
const findMatchingSlotIndex = (manualSlots, serviceDate) => {
  const reqHour = serviceDate.getHours();
  const reqMin  = serviceDate.getMinutes();
  const reqMins = reqHour * 60 + reqMin;

  const parseTime12h = (str) => {
    const m = str.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  for (let i = 0; i < manualSlots.length; i++) {
    const parts = manualSlots[i].time.split("-");
    if (parts.length < 2) continue;
    const start = parseTime12h(parts[0]);
    const end   = parseTime12h(parts[1]);
    if (start === null || end === null) continue;
    if (reqMins >= start && reqMins < end) return i;
  }

  return -1; // no match
};

const mergeWithAcceptedRequests = (manualSlots, requests) => {
  const mergedSlots = manualSlots.map((slot) => ({
    ...slot,
    source: "manual",
    requestInfo: null
  }));

  requests.forEach((request) => {
    const svcDate  = new Date(request.serviceDate);
    const matchIdx = findMatchingSlotIndex(manualSlots, svcDate);

    // Build a human-readable time label from the actual serviceDate
    const bookedTime = matchIdx >= 0
      ? manualSlots[matchIdx].time
      : formatTime12h(svcDate);

    const requestSlot = {
      slotId: `request-${request._id}`,
      time: bookedTime,
      status: "Booked",
      notes: `Booked by ${request.careseekerName}${request.careRecipientName ? ` for ${request.careRecipientName}` : ""}`,
      source: "request",
      requestInfo: {
        requestId:         request._id,
        careseekerName:    request.careseekerName,
        careRecipientName: request.careRecipientName,
        careRecipientAge:  request.careRecipientAge,
        careType:          request.careType,
        city:              request.city,
        address:           request.address,
        mobileNumber:      request.mobileNumber,
        specialCareNeeds:  request.specialCareNeeds,
        emergencyCases:    request.emergencyCases,
        serviceDate:       request.serviceDate,
        timeSlot:          bookedTime        // full range e.g. "8:00 AM - 10:00 AM"
      }
    };

    if (matchIdx >= 0) {
      // Replace the matched manual slot with the booked slot
      mergedSlots[matchIdx] = requestSlot;
    } else {
      // No slot matched — append so it's still visible
      mergedSlots.push(requestSlot);
    }
  });

  return mergedSlots;
};

const getDayRange = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start, end };
};

exports.getScheduleByDate = async (req, res) => {
  try {
    const { caregiverId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const schedule = await CaregiverSchedule.findOne({ caregiverId, date });
    const manualSlots = schedule?.slots?.length
      ? normalizeManualSlots(schedule.slots)
      : buildDefaultSlots();

    const { start, end } = getDayRange(date);
    const acceptedRequests = await CareRequest.find({
      caregiverId,
      status: { $in: ["accepted", "completed"] },
      serviceDate: {
        $gte: start,
        $lte: end
      }
    }).sort({ serviceDate: 1, createdAt: 1 });

    const mergedSlots = mergeWithAcceptedRequests(manualSlots, acceptedRequests);

    res.json({
      caregiverId,
      date,
      slots: mergedSlots
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load schedule" });
  }
};

exports.saveScheduleByDate = async (req, res) => {
  try {
    const { caregiverId } = req.params;
    const { date, slots } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const validStatuses = ["Free", "Unavailable", "Cancelled", "Manual Booking"];
    const manualSlots = normalizeManualSlots(slots).filter(
      (slot) =>
        slot.time &&
        validStatuses.includes(slot.status)
    );

    const savedSchedule = await CaregiverSchedule.findOneAndUpdate(
      { caregiverId, date },
      { caregiverId, date, slots: manualSlots },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: "Schedule saved successfully",
      schedule: savedSchedule
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to save schedule" });
  }
};
