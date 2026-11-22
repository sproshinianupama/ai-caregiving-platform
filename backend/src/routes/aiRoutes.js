const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

router.get("/predict-requests/:caregiverId", aiController.predictRequests);

module.exports = router;
