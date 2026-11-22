const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const upload = require("../middleware/upload");

router.post("/login", authController.login);

router.post("/register-careseeker", authController.registerCareseeker);

router.post(
  "/register-caregiver",
  upload.fields([
    { name: "nicFile", maxCount: 5 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "policeReport", maxCount: 1 },
    { name: "certificates", maxCount: 5 }
  ]),
  authController.registerCaregiver
);

module.exports = router;