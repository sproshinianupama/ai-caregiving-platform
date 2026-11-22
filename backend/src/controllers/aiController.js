const axios = require("axios");
const CareRequest = require("../models/CareRequest");
const Caregiver = require("../models/Caregiver");

const MIN_HISTORY = 5;

exports.predictRequests = async (req, res) => {
  try {
    const { caregiverId } = req.params;

    const history = await CareRequest.find({
      caregiverId,
      status: { $in: ["accepted", "completed"] }
    }).sort({ serviceDate: 1 });

    if (history.length < MIN_HISTORY) {
      return res.json({
        canPredict: false,
        minHistory: MIN_HISTORY,
        totalCompletedRequests: history.length,
        message: `At least ${MIN_HISTORY} accepted or completed requests are needed before predictions are shown.`
      });
    }

    // Fetch caregiver profile to send as metadata to XGBoost
    const caregiver = await Caregiver.findById(caregiverId).select(
      "careTypes district experienceYears emergencyAvailable"
    );

    // Calculate average rating from completed requests
    const ratedRequests = history.filter((r) => r.rating !== null && r.rating !== undefined);
    const avgRating =
      ratedRequests.length > 0
        ? ratedRequests.reduce((sum, r) => sum + r.rating, 0) / ratedRequests.length
        : 4.0;

    const response = await axios.post("http://localhost:5002/predict-caregiver", {
      history: history.map((item) => ({
        service_date: item.serviceDate,
        emergency_cases: item.emergencyCases
      })),
      caregiver: {
        careTypes: caregiver?.careTypes || [],
        district: caregiver?.district || "Colombo",
        experienceYears: caregiver?.experienceYears || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        emergencyAvailable: caregiver?.emergencyAvailable || false
      }
    });

    res.json({
      canPredict: true,
      minHistory: MIN_HISTORY,
      totalCompletedRequests: history.length,
      predictions: response.data
    });

  } catch (error) {

    console.error("AI prediction error:", error.message);

    res.status(500).json({
      message: "Failed to get AI prediction"
    });

  }
};
