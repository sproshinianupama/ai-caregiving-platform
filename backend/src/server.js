require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const authRoutes = require("./routes/authRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");
const requestRoutes = require("./routes/requestRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const careseekerRoutes = require("./routes/careseekerRoutes");
const path = require("path");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const Admin = require("./models/Admin");


const app = express();

const ensureDefaultAdmin = async () => {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingAdmin = await Admin.findOne({ username });

  if (existingAdmin) {
    existingAdmin.password = hashedPassword;
    existingAdmin.role = "admin";
    await existingAdmin.save();
    console.log(`Default admin password reset: ${username}`);
    return;
  }

  await Admin.create({
    username,
    password: hashedPassword,
    role: "admin"
  });

  console.log(`Default admin created: ${username}`);
};

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/caregivers", caregiverRoutes);
app.use("/api/careseekers", careseekerRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await ensureDefaultAdmin();
  })
  .catch((err) => console.log("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
