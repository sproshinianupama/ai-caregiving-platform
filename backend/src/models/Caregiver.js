const mongoose = require("mongoose");

const CaregiverSchema = new mongoose.Schema({
  fullName: String,
  dob: String,
  age: Number,
  gender: String,
  email: String,
  mobile: String,
  nic: String,
  address: String,
  district: String,
  city: String,
  latitude: Number,
  longitude: Number,
  username: String,
  password: String,

  documents: {
    nicFile: {
      type: [String],
      default: []
    },
    profilePhoto: String,
    policeReport: String,
    certificates: {
      type: [String],
      default: []
    }
  },

  role: {
    type: String,
    default: "caregiver"
  },

  emergencyAvailable: {
    type: Boolean,
    default: false
  },

  careTypes: {
    type: [String],
    default: []
  },

  skills: {
    type: String,
    default: ""
  },

  experienceYears: {
    type: Number,
    default: 0
  },

  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Caregiver", CaregiverSchema);
