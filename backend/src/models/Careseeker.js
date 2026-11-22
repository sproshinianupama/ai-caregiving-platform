const mongoose = require("mongoose");

const CareseekerSchema = new mongoose.Schema({
  fullName: String,
  nic: String,
  email: String,
  mobile: String,
  address: String,
  district: String,
  city: String,
  emergency: String,
  profilePhoto: String,
  username: String,
  password: String,

  role: {
    type: String,
    default: "careseeker"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Careseeker", CareseekerSchema);
