const fs = require("fs");
const path = require("path");

const Caregiver = require("../models/Caregiver");

const removeUploadedFile = (filename) => {
  if (!filename) return;

  const filePath = path.join(__dirname, "../uploads", filename);

  fs.unlink(filePath, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Failed to remove caregiver profile photo:", error);
    }
  });
};

const canUpdateCaregiver = (req) => {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;

  return String(req.user.id) === String(req.params.caregiverId);
};

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

exports.getCaregiverById = async (req, res) => {
  try {
    const caregiver = await Caregiver.findById(req.params.caregiverId).select("-password");

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    res.json(caregiver);
  } catch (error) {
    res.status(500).json({ message: "Failed to load caregiver profile" });
  }
};

exports.updateEmergencyStatus = async (req, res) => {
  try {
    const { caregiverId } = req.params;
    const { emergencyAvailable } = req.body;

    const caregiver = await Caregiver.findByIdAndUpdate(
      caregiverId,
      { emergencyAvailable: Boolean(emergencyAvailable) },
      { new: true }
    ).select("-password");

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    res.json({
      message: "Emergency status updated successfully",
      caregiver
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update emergency status" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!canUpdateCaregiver(req)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      fullName,
      dob,
      age,
      gender,
      nic,
      email,
      mobile,
      address,
      district,
      city,
      careTypes,
      skills,
      experienceYears
    } = req.body;

    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (dob !== undefined) updates.dob = dob;
    if (age !== undefined) updates.age = age === "" ? null : Number(age);
    if (gender !== undefined) updates.gender = gender;
    if (nic !== undefined) updates.nic = nic;
    if (email !== undefined) updates.email = email;
    if (mobile !== undefined) updates.mobile = mobile;
    if (address !== undefined) updates.address = address;
    if (district !== undefined) updates.district = district;
    if (city !== undefined) updates.city = city;
    if (skills !== undefined) updates.skills = skills;
    if (experienceYears !== undefined) {
      updates.experienceYears =
        experienceYears === "" ? 0 : Number(experienceYears) || 0;
    }
    if (careTypes !== undefined) {
      updates.careTypes = Array.isArray(careTypes) ? careTypes : [];
    }

    const caregiver = await Caregiver.findByIdAndUpdate(
      req.params.caregiverId,
      updates,
      { new: true }
    ).select("-password");

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    res.json({
      message: "Profile updated successfully",
      caregiver
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update profile" });
  }
};

exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!canUpdateCaregiver(req)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a JPG or PNG profile photo" });
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(req.file.mimetype)) {
      removeUploadedFile(req.file.filename);
      return res.status(400).json({ message: "Only JPG and PNG profile photos are allowed" });
    }

    const caregiver = await Caregiver.findById(req.params.caregiverId);

    if (!caregiver) {
      removeUploadedFile(req.file.filename);
      return res.status(404).json({ message: "Caregiver not found" });
    }

    removeUploadedFile(caregiver.documents?.profilePhoto);
    caregiver.documents = caregiver.documents || {};
    caregiver.documents.profilePhoto = req.file.filename;
    await caregiver.save();

    res.json({
      message: "Profile photo saved successfully",
      profilePhoto: caregiver.documents.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to save profile photo" });
  }
};

exports.deleteProfilePhoto = async (req, res) => {
  try {
    if (!canUpdateCaregiver(req)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const caregiver = await Caregiver.findById(req.params.caregiverId);

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    removeUploadedFile(caregiver.documents?.profilePhoto);
    caregiver.documents = caregiver.documents || {};
    caregiver.documents.profilePhoto = "";
    await caregiver.save();

    res.json({
      message: "Profile photo deleted successfully",
      profilePhoto: ""
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete profile photo" });
  }
};

exports.listEmergencyCaregivers = async (req, res) => {
  try {
    const { latitude, longitude, city, careType, specialCareNeeds, careRecipientAge, emergencyCases } = req.query;

    const caregivers = await Caregiver.find(
      { emergencyAvailable: true },
      "fullName city district address username latitude longitude mobile email nic age gender dob emergencyAvailable careTypes skills experienceYears documents"
    ).sort({ createdAt: -1 });

    const parsedLatitude = latitude ? Number(latitude) : null;
    const parsedLongitude = longitude ? Number(longitude) : null;
    const hasUserLocation =
      Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

    // Same scoring logic as requestController
    const SPECIAL_NEED_KEYWORDS = {
      paralyse: ["paralysis", "paralyzed", "paralysed", "stroke", "mobility", "bedridden"],
      paralysis: ["paralyse", "paralyzed", "paralysed", "stroke", "mobility"],
      dementia: ["alzheimer", "memory", "elder"],
      autism: ["special", "child", "development"],
      diabetes: ["elder", "medication", "chronic"],
      wheelchair: ["mobility", "disabled", "transfer"]
    };

    const tokenizeText = (text) =>
      String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

    const matchesNeedToken = (needToken, skillText, skillTokens) => {
      if (!needToken) return false;
      if (skillTokens.includes(needToken) || skillText.includes(needToken)) return true;
      if (skillTokens.some((s) => s.includes(needToken) || needToken.includes(s))) return true;
      const aliases = SPECIAL_NEED_KEYWORDS[needToken] || [];
      return aliases.some((a) => skillText.includes(a) || skillTokens.some((s) => s.includes(a)));
    };

    const getCareTypes = (cg) => {
      if (Array.isArray(cg.careTypes) && cg.careTypes.length > 0) return cg.careTypes;
      const st = String(cg.skills || "").toLowerCase();
      const inf = [];
      if (/child|pediatric|infant|baby|toddler/.test(st)) inf.push("Childcare");
      if (/elder|senior|dementia|alzheimer|geriatric/.test(st)) inf.push("Eldercare");
      if (/disab|special needs|autism|mobility|paralys|wheelchair/.test(st)) inf.push("Disabled Care");
      return inf;
    };

    const scoreMatch = (cg, distanceKm) => {
      const reasons = [];
      let score = 0;

      const requestedCareType = String(careType || "").trim();
      const cgCareTypes = getCareTypes(cg);
      const hasDeclared = cgCareTypes.length > 0;
      const declared = Array.isArray(cg.careTypes) ? cg.careTypes.filter(Boolean) : [];

      if (requestedCareType) {
        if (cgCareTypes.includes(requestedCareType)) {
          score += 35;
          reasons.push(declared.includes(requestedCareType) ? "Care type match" : "Care type matched from skills");
        } else if (!hasDeclared) {
          score += 15;
          reasons.push("Care type not listed on profile");
        } else {
          return null;
        }
      }

      const needTokens = tokenizeText(specialCareNeeds);
      const skillTokens = tokenizeText(cg.skills);
      const skillText = String(cg.skills || "").toLowerCase();
      const overlap = needTokens.filter((tk) => matchesNeedToken(tk, skillText, skillTokens));

      if (needTokens.length > 0) {
        const ratio = overlap.length / needTokens.length;
        const skillsScore = Math.max(overlap.length > 0 ? 10 : 0, Math.round(ratio * 25));
        score += skillsScore;
        if (skillsScore >= 15) reasons.push("Strong special-needs match");
        else if (skillsScore >= 10) reasons.push("Partial special-needs match");
        else if (cg.skills) reasons.push("Skills listed on profile");
        else { reasons.push("Special needs noted for manual review"); score += 5; }
      }

      const age = Number(careRecipientAge);
      if (Number.isFinite(age)) {
        if (requestedCareType === "Childcare" && age < 18) { score += 15; reasons.push("Suitable for child recipient"); }
        else if (requestedCareType === "Eldercare" && age >= 50) { score += 15; reasons.push("Suitable for elder recipient"); }
        else if (requestedCareType === "Eldercare" && age >= 45) { score += 10; reasons.push("Suitable for older adult recipient"); }
        else if (requestedCareType === "Disabled Care") { score += 12; reasons.push("Disabled care specialist"); }
        else { score += 6; reasons.push("General age suitability"); }
      }

      // Emergency is always ON for these caregivers
      score += 15;
      reasons.push("Emergency availability ON");

      const exp = Number(cg.experienceYears || 0);
      score += Math.min(10, exp);
      if (exp >= 3) reasons.push(`${exp} years experience`);

      const certsArr = Array.isArray(cg.documents?.certificates) ? cg.documents.certificates : [];
      if (certsArr.length > 0 || cg.documents?.certificates) { score += 5; reasons.push("Certificates uploaded"); }

      if (distanceKm !== null && Number.isFinite(distanceKm)) {
        if (distanceKm <= 5) { score += 5; reasons.push("Within 5 km"); }
        else if (distanceKm <= 15) { score += 3; reasons.push("Within 15 km"); }
        else if (distanceKm <= 50) { score += 1; reasons.push("Within 50 km"); }
      }

      return { matchScore: Math.min(100, Math.max(10, score)), matchReasons: [...new Set(reasons)] };
    };

    let results = caregivers
      .map((cg) => {
        const cgData = cg.toObject();
        const hasCgLocation = Number.isFinite(cgData.latitude) && Number.isFinite(cgData.longitude);

        let distanceKm = null;
        if (hasUserLocation && hasCgLocation) {
          distanceKm = Number(calculateDistanceKm(parsedLatitude, parsedLongitude, cgData.latitude, cgData.longitude).toFixed(2));
        }

        // If careseeker has location, skip caregivers who have no location (can't calculate distance)
        if (hasUserLocation && !hasCgLocation) return null;

        const scored = scoreMatch(cgData, distanceKm);
        if (!scored) return null;

        return {
          ...cgData,
          careTypes: getCareTypes(cgData),
          distanceKm,
          etaMinutes: distanceKm !== null ? Math.max(5, Math.round(distanceKm * 4)) : null,
          matchScore: scored.matchScore,
          matchReasons: scored.matchReasons
        };
      })
      .filter(Boolean)
      .filter((cg) => {
        if (!city) return true;
        const cgCity = String(cg.city || "").toLowerCase();
        const cgDistrict = String(cg.district || "").toLowerCase();
        return cgCity.includes(city.toLowerCase()) || cgDistrict.includes(city.toLowerCase());
      });

    // Sort by matchScore first, then distance
    results = results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Failed to load emergency caregivers" });
  }
};
