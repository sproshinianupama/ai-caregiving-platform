const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Caregiver = require("../models/Caregiver");
const Careseeker = require("../models/Careseeker");

const normalizeRegistrationData = (data) => {
  const normalized = {};

  Object.entries(data || {}).forEach(([key, value]) => {
    if (typeof value === "string") {
      normalized[key] =
        key === "password" ? value.normalize("NFC") : value.normalize("NFC").trim();
      return;
    }

    normalized[key] = value;
  });

  return normalized;
};

const findUserByUsername = async (username) => {
  const admin = await Admin.findOne({ username });

  if (admin) {
    return { user: admin, role: "admin" };
  }

  const caregiver = await Caregiver.findOne({ username });

  if (caregiver) {
    return { user: caregiver, role: "caregiver" };
  }

  const careseeker = await Careseeker.findOne({ username });

  if (careseeker) {
    return { user: careseeker, role: "careseeker" };
  }

  return { user: null, role: null };
};

const buildUserPayload = (user, role) => ({
  id: user._id.toString(),
  fullName: user.fullName || user.username,
  username: user.username,
  email: user.email || "",
  mobile: user.mobile || "",
  address: user.address || "",
  nic: user.nic || "",
  profilePhoto: user.profilePhoto || user.documents?.profilePhoto || "",
  role
});

const signToken = (user, role) =>
  jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// REGISTER CAREGIVER
exports.registerCaregiver = async (req, res) => {

  try {

    const data = normalizeRegistrationData(req.body);
    const { user: existingUser } = await findUserByUsername(data.username);

    if (existingUser) {
      return res.status(400).json({
        message: "That username is already in use. Please choose a different username."
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    let careTypes = [];

    if (data.careTypes) {
      try {
        const parsed = JSON.parse(data.careTypes);
        careTypes = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        careTypes = String(data.careTypes)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    const caregiver = new Caregiver({
      ...data,
      careTypes,
      skills: data.skills || "",
      experienceYears: data.experienceYears ? Number(data.experienceYears) : 0,
      password: hashedPassword,
      documents: {
        nicFile: (req.files.nicFile || []).map((f) => f.filename),
        profilePhoto: req.files.profilePhoto?.[0]?.filename || "",
        policeReport: req.files.policeReport?.[0]?.filename || "",
        certificates: (req.files.certificates || []).map((f) => f.filename)
      }
    });

    await caregiver.save();

    res.json({ message: "Caregiver registered successfully" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


// REGISTER CARESEEKER
exports.registerCareseeker = async (req, res) => {

  try {

    const data = normalizeRegistrationData(req.body);
    const { user: existingUser } = await findUserByUsername(data.username);

    if (existingUser) {
      return res.status(400).json({
        message: "That username is already in use. Please choose a different username."
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const careseeker = new Careseeker({
      ...data,
      password: hashedPassword
    });

    await careseeker.save();

    res.json({ message: "Careseeker registered successfully" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};



// LOGIN
exports.login = async (req, res) => {

  const { username, password } = normalizeRegistrationData(req.body);

  try {

    const { user, role } = await findUserByUsername(username);

    if (!user)
      return res.status(400).json({ message: "User not found" });

    // Block caregivers who are not yet approved
    if (role === "caregiver") {
      if (user.approvalStatus === "pending") {
        return res.status(403).json({
          message: "Your account is under admin review. You will be able to log in once your account is approved."
        });
      }
      if (user.approvalStatus === "rejected") {
        return res.status(403).json({
          message: "Your registration was not approved by the admin. Please contact support for more information."
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    res.json({
      token: signToken(user, role),
      user: buildUserPayload(user, role)
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};
