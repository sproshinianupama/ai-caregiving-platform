const SPECIAL_NEED_KEYWORDS = {
  paralyse: ["paralysis", "paralyzed", "paralysed", "stroke", "mobility", "bedridden"],
  paralysis: ["paralyse", "paralyzed", "paralysed", "stroke", "mobility"],
  dementia: ["alzheimer", "memory", "elder"],
  autism: ["special", "child", "development"],
  diabetes: ["elder", "medication", "chronic"],
  wheelchair: ["mobility", "disabled", "transfer"],
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

export const scoreCaregiverMatch = (caregiver, filters, distanceKm = null) => {
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

  const matchScore = Math.min(100, Math.max(10, score));

  return {
    matchScore,
    matchReasons: [...new Set(reasons)]
  };
};

export const enrichCaregiverMatches = (caregivers, filters) =>
  caregivers
    .map((caregiver) => {
      const hasServerScore =
        typeof caregiver.matchScore === "number" && caregiver.matchScore > 0;

      if (hasServerScore && caregiver.matchReasons?.length) {
        return caregiver;
      }

      const matchResult = scoreCaregiverMatch(
        caregiver,
        filters,
        caregiver.distanceKm ?? null
      );

      if (!matchResult) {
        return null;
      }

      return {
        ...caregiver,
        matchScore: matchResult.matchScore,
        matchReasons: matchResult.matchReasons,
        careTypes: getCaregiverCareTypes(caregiver)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
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
