const fs = require("fs");
const path = require("path");

const Careseeker = require("../models/Careseeker");

const removeUploadedFile = (filename) => {
  if (!filename) return;

  const filePath = path.join(__dirname, "../uploads", filename);

  fs.unlink(filePath, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Failed to remove careseeker profile photo:", error);
    }
  });
};

const canUpdateCareseeker = (req) =>
  req.user.role === "admin" || req.user.id === req.params.id;

exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!canUpdateCareseeker(req)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a JPG or PNG profile photo" });
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(req.file.mimetype)) {
      removeUploadedFile(req.file.filename);
      return res.status(400).json({ message: "Only JPG and PNG profile photos are allowed" });
    }

    const careseeker = await Careseeker.findById(req.params.id);

    if (!careseeker) {
      removeUploadedFile(req.file.filename);
      return res.status(404).json({ message: "Careseeker not found" });
    }

    removeUploadedFile(careseeker.profilePhoto);
    careseeker.profilePhoto = req.file.filename;
    await careseeker.save();

    res.json({
      message: "Profile photo saved successfully",
      profilePhoto: careseeker.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to save profile photo" });
  }
};

exports.deleteProfilePhoto = async (req, res) => {
  try {
    if (!canUpdateCareseeker(req)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const careseeker = await Careseeker.findById(req.params.id);

    if (!careseeker) {
      return res.status(404).json({ message: "Careseeker not found" });
    }

    removeUploadedFile(careseeker.profilePhoto);
    careseeker.profilePhoto = "";
    await careseeker.save();

    res.json({
      message: "Profile photo deleted successfully",
      profilePhoto: ""
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete profile photo" });
  }
};
