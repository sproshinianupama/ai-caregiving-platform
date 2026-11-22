const express = require("express");

const adminController = require("../controllers/adminController");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/dashboard", adminController.getDashboard);
router.get("/caregivers", adminController.getCaregivers);
router.get("/careseekers", adminController.getCareseekers);
router.get("/registrations", adminController.getRegistrations);
router.put("/registrations/:role/:id", adminController.updateRegistration);
router.delete("/registrations/:role/:id", adminController.deleteRegistration);
router.patch("/caregivers/:id/approval", adminController.updateCaregiverApproval);

module.exports = router;
