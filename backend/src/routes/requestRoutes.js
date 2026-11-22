const express = require("express");
const requestController = require("../controllers/requestController");

const router = express.Router();

router.get("/caregivers", requestController.listCaregivers);
router.post("/", requestController.createRequest);
router.get("/careseeker/:careseekerId", requestController.getCareseekerRequests);
router.get("/caregiver/:caregiverId", requestController.getCaregiverRequests);
router.patch("/:requestId/status", requestController.updateRequestStatus);
router.patch("/:requestId/rating", requestController.submitRating);

module.exports = router;
