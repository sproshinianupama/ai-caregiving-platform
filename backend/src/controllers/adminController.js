const Caregiver = require("../models/Caregiver");
const Careseeker = require("../models/Careseeker");
const CareRequest = require("../models/CareRequest");
const mongoose = require("mongoose");

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const mapRegistration = (item, role) => ({
  id: item._id,
  role,
  fullName: item.fullName || item.username,
  username: item.username,
  email: item.email || "",
  mobile: item.mobile || "",
  city: item.city || "",
  district: item.district || "",
  address: item.address || "",
  nic: item.nic || "",
  createdAt: item.createdAt,
  approvalStatus: role === "caregiver" ? (item.approvalStatus || "pending") : null,
  documents:
    role === "caregiver"
      ? {
          nicFile: item.documents?.nicFile || "",
          profilePhoto: item.documents?.profilePhoto || "",
          policeReport: item.documents?.policeReport || "",
          certificates: item.documents?.certificates || ""
        }
      : null
});

const getRegistrationModel = (role) => {
  if (role === "caregiver") return Caregiver;
  if (role === "careseeker") return Careseeker;
  return null;
};

const getRegistrationUpdates = (body) => {
  const allowedFields = [
    "fullName",
    "username",
    "nic",
    "email",
    "mobile",
    "district",
    "city",
    "address"
  ];

  return allowedFields.reduce((updates, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }

    return updates;
  }, {});
};

exports.getDashboard = async (req, res) => {
  try {
    const today = startOfToday();

    const [
      totalCaregivers,
      totalCareseekers,
      caregiversRegisteredToday,
      careseekersRegisteredToday,
      emergencyRequestsToday,
      recentCaregivers,
      recentCareseekers,
      recentRequests,
      allCaregivers
    ] = await Promise.all([
      Caregiver.countDocuments(),
      Careseeker.countDocuments(),
      Caregiver.countDocuments({ createdAt: { $gte: today } }),
      Careseeker.countDocuments({ createdAt: { $gte: today } }),
      CareRequest.countDocuments({
        createdAt: { $gte: today },
        emergencyCases: { $gt: 0 }
      }),
      Caregiver.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(5),
      Careseeker.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(5),
      CareRequest.find()
        .sort({ createdAt: -1 })
        .limit(5),
      Caregiver.find()
        .select("-password")
        .sort({ createdAt: -1 })
    ]);

    const recentRegistrations = [
      ...recentCaregivers.map((item) => mapRegistration(item, "caregiver")),
      ...recentCareseekers.map((item) => mapRegistration(item, "careseeker"))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    res.json({
      summary: {
        totalCaregivers,
        totalCareseekers,
        newRegistrationsToday: caregiversRegisteredToday + careseekersRegisteredToday,
        emergencyRequestsToday
      },
      recentRegistrations,
      allCaregiverRegistrations: allCaregivers.map((item) => mapRegistration(item, "caregiver")),
      recentRequests: recentRequests.map((request) => ({
        id: request._id,
        caregiverName: request.caregiverName,
        careseekerName: request.careseekerName,
        city: request.city || "",
        status: request.status,
        emergencyCases: request.emergencyCases,
        createdAt: request.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin dashboard" });
  }
};

exports.getCaregivers = async (req, res) => {
  try {
    const caregivers = await Caregiver.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(caregivers);
  } catch (error) {
    res.status(500).json({ message: "Failed to load caregivers" });
  }
};

exports.getCareseekers = async (req, res) => {
  try {
    const careseekers = await Careseeker.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(careseekers);
  } catch (error) {
    res.status(500).json({ message: "Failed to load careseekers" });
  }
};

exports.getRegistrations = async (req, res) => {
  try {
    const [caregivers, careseekers] = await Promise.all([
      Caregiver.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(25),
      Careseeker.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(25)
    ]);

    const registrations = [
      ...caregivers.map((item) => mapRegistration(item, "caregiver")),
      ...careseekers.map((item) => mapRegistration(item, "careseeker"))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: "Failed to load registrations" });
  }
};

exports.updateRegistration = async (req, res) => {
  try {
    const RegistrationModel = getRegistrationModel(req.params.role);

    if (!RegistrationModel) {
      return res.status(400).json({ message: "Invalid registration role" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid registration id" });
    }

    const updates = getRegistrationUpdates(req.body);
    const registration = await RegistrationModel.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    Object.assign(registration, updates);
    await registration.save();

    res.json(mapRegistration(registration, req.params.role));
  } catch (error) {
    console.error("Failed to update registration:", error);
    res.status(500).json({
      message: error.message || "Failed to update registration"
    });
  }
};

exports.updateCaregiverApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid approval status. Must be 'approved' or 'rejected'." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid caregiver id." });
    }

    const caregiver = await Caregiver.findByIdAndUpdate(
      id,
      { approvalStatus: status },
      { new: true }
    );

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found." });
    }

    res.json({
      message: `Caregiver ${status === "approved" ? "approved" : "rejected"} successfully.`,
      approvalStatus: caregiver.approvalStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update caregiver approval status." });
  }
};

exports.deleteRegistration = async (req, res) => {
  try {
    const RegistrationModel = getRegistrationModel(req.params.role);

    if (!RegistrationModel) {
      return res.status(400).json({ message: "Invalid registration role" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid registration id" });
    }

    const registration = await RegistrationModel.findByIdAndDelete(req.params.id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    res.json({ message: "Registration deleted permanently" });
  } catch (error) {
    console.error("Failed to delete registration:", error);
    res.status(500).json({
      message: error.message || "Failed to delete registration"
    });
  }
};
