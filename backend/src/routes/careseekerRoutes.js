const express = require("express");

const careseekerController = require("../controllers/careseekerController");
const { authenticate } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(authenticate);

router.patch(
  "/:id/profile-photo",
  upload.single("profilePhoto"),
  careseekerController.updateProfilePhoto
);
router.delete("/:id/profile-photo", careseekerController.deleteProfilePhoto);

module.exports = router;
