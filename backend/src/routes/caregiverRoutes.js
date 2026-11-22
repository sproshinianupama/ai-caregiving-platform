const express = require("express");
const caregiverController = require("../controllers/caregiverController");
const { authenticate } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/emergency-available", caregiverController.listEmergencyCaregivers);
router.patch("/:caregiverId/emergency-status", caregiverController.updateEmergencyStatus);
router.patch("/:caregiverId/profile", authenticate, caregiverController.updateProfile);
router.patch(
  "/:caregiverId/profile-photo",
  authenticate,
  upload.single("profilePhoto"),
  caregiverController.updateProfilePhoto
);
router.delete(
  "/:caregiverId/profile-photo",
  authenticate,
  caregiverController.deleteProfilePhoto
);
router.get("/:caregiverId", caregiverController.getCaregiverById);

module.exports = router;
