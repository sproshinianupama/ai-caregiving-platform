const express = require("express");
const scheduleController = require("../controllers/scheduleController");

const router = express.Router();

router.get("/:caregiverId", scheduleController.getScheduleByDate);
router.put("/:caregiverId", scheduleController.saveScheduleByDate);

module.exports = router;
