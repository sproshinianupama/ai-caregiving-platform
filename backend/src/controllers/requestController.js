const Caregiver = require("../models/Caregiver");
const Careseeker = require("../models/Careseeker");
const CareRequest = require("../models/CareRequest");

const toRadians = (value) => (value * Math.PI) / 180;

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const SPECIAL_NEED_KEYWORDS = {
  paralyse: ["paralysis", "paralyzed", "paralysed", "stroke", "mobility", "bedridden"],
  paralysis: ["paralyse", "paralyzed", "paralysed", "stroke", "mobility"],
  dementia: ["alzheimer", "memory", "elder"],
  autism: ["special", "child", "development"],
  diabetes: ["elder", "medication", "chronic"],
  wheelchair: ["mobility", "disabled", "transfer"]
};

const tokenizeText = (text) =>
  String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

const matchesNeedToken = (needToken, skillText, skillTokens) => {
  if (!needToken) return false;

  if (skillTokens.includes(needToken) || skillText.includes(needToken)) {
    return true;
  }

  if (skillTokens.some((skill) => skill.includes(needToken) || needToken.includes(skill))) {
    return true;
  }

  const aliases = SPECIAL_NEED_KEYWORDS[needToken] || [];

  return aliases.some(
    (alias) => skillText.includes(alias) || skillTokens.some((skill) => skill.includes(alias))
  );
};

const getCaregiverCareTypes = (caregiver) => {
  if (Array.isArray(caregiver.careTypes) && caregiver.careTypes.length > 0) {
    return caregiver.careTypes;
  }

  const skillText = String(caregiver.skills || "").toLowerCase();
  const inferred = [];

  if (/child|pediatric|infant|baby|toddler/.test(skillText)) {
    inferred.push("Childcare");
  }

  if (/elder|senior|dementia|alzheimer|geriatric/.test(skillText)) {
    inferred.push("Eldercare");
  }

  if (/disab|special needs|autism|mobility|paralys|wheelchair/.test(skillText)) {
    inferred.push("Disabled Care");
  }

  return inferred;
};

const scoreCaregiverMatch = (caregiver, filters, distanceKm = null) => {
  const reasons = [];
  let score = 0;

  const requestedCareType = String(filters.careType || "").trim();
  const caregiverCareTypes = getCaregiverCareTypes(caregiver);
  const hasDeclaredCareTypes = caregiverCareTypes.length > 0;

  const declaredCareTypes = Array.isArray(caregiver.careTypes)
    ? caregiver.careTypes.filter(Boolean)
    : [];

  if (requestedCareType) {
    if (caregiverCareTypes.includes(requestedCareType)) {
      score += 35;
      reasons.push(
        declaredCareTypes.includes(requestedCareType)
          ? "Care type match"
          : "Care type matched from skills"
      );
    } else if (!hasDeclaredCareTypes) {
      score += 15;
      reasons.push("Care type not listed on profile");
    } else {
      return null;
    }
  }

  const needTokens = tokenizeText(filters.specialCareNeeds);
  const skillTokens = tokenizeText(caregiver.skills);
  const skillText = String(caregiver.skills || "").toLowerCase();
  const overlap = needTokens.filter((token) =>
    matchesNeedToken(token, skillText, skillTokens)
  );

  if (needTokens.length > 0) {
    const ratio = overlap.length / needTokens.length;
    const skillsScore = Math.max(overlap.length > 0 ? 10 : 0, Math.round(ratio * 25));

    score += skillsScore;

    if (skillsScore >= 15) {
      reasons.push("Strong special-needs match");
    } else if (skillsScore >= 10) {
      reasons.push("Partial special-needs match");
    } else if (caregiver.skills) {
      reasons.push("Skills listed on profile");
    } else {
      reasons.push("Special needs noted for manual review");
      score += 5;
    }
  }

  const recipientAge = Number(filters.careRecipientAge);

  if (Number.isFinite(recipientAge)) {
    if (requestedCareType === "Childcare" && recipientAge < 18) {
      score += 15;
      reasons.push("Suitable for child recipient");
    } else if (requestedCareType === "Eldercare" && recipientAge >= 50) {
      score += 15;
      reasons.push("Suitable for elder recipient");
    } else if (requestedCareType === "Eldercare" && recipientAge >= 45) {
      score += 10;
      reasons.push("Suitable for older adult recipient");
    } else if (requestedCareType === "Disabled Care") {
      score += 12;
      reasons.push("Disabled care specialist");
    } else {
      score += 6;
      reasons.push("General age suitability");
    }
  }

  const emergencyCases = Number(filters.emergencyCases || 0);

  if (emergencyCases > 0) {
    if (caregiver.emergencyAvailable) {
      score += 15;
      reasons.push("Emergency availability ON");
    } else {
      score += 3;
      reasons.push("Emergency support not enabled");
    }
  } else if (caregiver.emergencyAvailable) {
    score += 5;
    reasons.push("Emergency ready");
  }

  const experienceYears = Number(caregiver.experienceYears || 0);
  const experienceScore = Math.min(10, experienceYears);

  score += experienceScore;

  if (experienceYears >= 3) {
    reasons.push(`${experienceYears} years experience`);
  }

  if (caregiver.documents?.certificates) {
    score += 5;
    reasons.push("Certificates uploaded");
  }

  if (distanceKm !== null && Number.isFinite(distanceKm)) {
    if (distanceKm <= 5) {
      score += 5;
      reasons.push("Within 5 km");
    } else if (distanceKm <= 15) {
      score += 3;
      reasons.push("Within 15 km");
    } else if (distanceKm <= 50) {
      score += 1;
      reasons.push("Within 50 km");
    }
  }

  return {
    matchScore: Math.min(100, Math.max(10, score)),
    matchReasons: [...new Set(reasons)]
  };
};

exports.listCaregivers = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      city,
      careType,
      specialCareNeeds,
      careRecipientAge,
      emergencyCases
    } = req.query;

    const caregivers = await Caregiver.find(
      {},
      "fullName city district username latitude longitude careTypes skills experienceYears emergencyAvailable documents"
    ).sort({
      createdAt: -1
    });

    // Aggregate ratings for all caregivers in one query
    const ratingsAgg = await CareRequest.aggregate([
      { $match: { rating: { $ne: null, $exists: true } } },
      {
        $group: {
          _id: "$caregiverId",
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const ratingsMap = {};
    ratingsAgg.forEach((item) => {
      ratingsMap[String(item._id)] = {
        avgRating: Math.round(item.avgRating * 10) / 10,
        totalRatings: item.totalRatings
      };
    });

    const parsedLatitude = latitude ? Number(latitude) : null;
    const parsedLongitude = longitude ? Number(longitude) : null;
    const hasUserLocation =
      Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
    const normalizedSearchCity = String(city || "").trim().toLowerCase();
    const matchFilters = {
      careType,
      specialCareNeeds,
      careRecipientAge,
      emergencyCases
    };

    let formattedCaregivers = caregivers
      .map((caregiver) => {
        const caregiverData = caregiver.toObject();

        const hasCaregiverLocation =
          Number.isFinite(caregiverData.latitude) &&
          Number.isFinite(caregiverData.longitude);

        let distanceKm = null;

        if (hasUserLocation && hasCaregiverLocation) {
          distanceKm = calculateDistanceKm(
            parsedLatitude,
            parsedLongitude,
            caregiverData.latitude,
            caregiverData.longitude
          );
        }

        const scoredMatch = scoreCaregiverMatch(
          caregiverData,
          matchFilters,
          distanceKm === null ? null : Number(distanceKm.toFixed(2))
        );

        if (!scoredMatch) {
          return null;
        }

        return {
          ...caregiverData,
          careTypes: getCaregiverCareTypes(caregiverData),
          distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
          matchScore: scoredMatch.matchScore,
          matchReasons: scoredMatch.matchReasons,
          avgRating: ratingsMap[String(caregiverData._id)]?.avgRating ?? null,
          totalRatings: ratingsMap[String(caregiverData._id)]?.totalRatings ?? 0
        };
      })
      .filter(Boolean)
      .filter((caregiver) => {
        if (!normalizedSearchCity) {
          return true;
        }

        const caregiverCity = String(caregiver.city || "").toLowerCase();
        const caregiverDistrict = String(caregiver.district || "").toLowerCase();

        return (
          caregiverCity.includes(normalizedSearchCity) ||
          caregiverDistrict.includes(normalizedSearchCity)
        );
      });

    formattedCaregivers = formattedCaregivers.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }

      if (a.distanceKm === null && b.distanceKm === null) {
        return 0;
      }

      if (a.distanceKm === null) {
        return 1;
      }

      if (b.distanceKm === null) {
        return -1;
      }

      return a.distanceKm - b.distanceKm;
    });

    res.json(formattedCaregivers);
  } catch (error) {
    res.status(500).json({ message: "Failed to load caregivers" });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const {
      caregiverId,
      careseekerUsername,
      careType,
      city,
      mobileNumber,
      address,
      careRecipientName,
      careRecipientAge,
      specialCareNeeds,
      emergencyCases,
      serviceDate
    } = req.body;

    if (
      !caregiverId ||
      !careseekerUsername ||
      !careType ||
      !mobileNumber ||
      !careRecipientName ||
      !careRecipientAge ||
      !specialCareNeeds
    ) {
      return res.status(400).json({
        message: "Please fill all required details before sending the request."
      });
    }

    const caregiver = await Caregiver.findById(caregiverId);

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    let careseekerId = null;
    let careseekerName = careseekerUsername || "Unknown Careseeker";

    if (careseekerUsername) {
      const careseeker = await Careseeker.findOne({ username: careseekerUsername });

      if (careseeker) {
        careseekerId = careseeker._id;
        careseekerName = careseeker.fullName || careseeker.username;
      }
    }

    const request = new CareRequest({
      caregiverId: caregiver._id,
      caregiverName: caregiver.fullName || caregiver.username,
      careseekerId,
      careseekerName,
      careType,
      city,
      mobileNumber,
      address,
      careRecipientName,
      careRecipientAge: careRecipientAge ? Number(careRecipientAge) : null,
      specialCareNeeds,
      emergencyCases: Number(emergencyCases || 0),
      serviceDate: serviceDate || new Date(),
      statusMessage: "Your booking request was sent to the caregiver."
    });

    await request.save();

    res.status(201).json({
      message: "Request sent successfully",
      request
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create request", error: error.message });
  }
};

exports.getCareseekerRequests = async (req, res) => {
  try {
    const { careseekerId } = req.params;

    const requests = await CareRequest.find({ careseekerId }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load careseeker requests" });
  }
};

exports.getCaregiverRequests = async (req, res) => {
  try {
    const { caregiverId } = req.params;

    const requests = await CareRequest.find({ caregiverId }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load caregiver requests" });
  }
};

exports.submitRating = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rating, ratingComment } = req.body;

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be a whole number between 1 and 5." });
    }

    const request = await CareRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "completed") {
      return res.status(400).json({ message: "You can only rate a completed booking." });
    }

    if (request.rating !== null && request.rating !== undefined) {
      return res.status(400).json({ message: "You have already rated this booking." });
    }

    request.rating = parsedRating;
    request.ratingComment = String(ratingComment || "").trim();
    await request.save();

    res.json({ message: "Rating submitted successfully", request });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit rating" });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!["accepted", "completed", "declined"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let statusMessage = "Request updated.";

    if (status === "accepted") {
      statusMessage = "Your caregiver accepted this booking request.";
    }

    if (status === "completed") {
      statusMessage = "Your caregiving request was completed.";
    }

    if (status === "declined") {
      statusMessage = "Your caregiver declined this booking request.";
    }

    const request = await CareRequest.findByIdAndUpdate(
      requestId,
      { status, statusMessage },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      message: "Request updated successfully",
      request
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update request status" });
  }
};
