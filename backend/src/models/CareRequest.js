const mongoose = require("mongoose");

const CareRequestSchema = new mongoose.Schema(
  {
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Caregiver",
      required: true
    },
    caregiverName: {
      type: String,
      required: true
    },
    careseekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Careseeker",
      default: null
    },
    careseekerName: {
      type: String,
      required: true
    },
    careType: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    mobileNumber: {
      type: String,
      default: ""
    },
    address: {
      type: String,
      default: ""
    },
    careRecipientName: {
      type: String,
      default: ""
    },
    careRecipientAge: {
      type: Number,
      default: null
    },
    specialCareNeeds: {
      type: String,
      default: ""
    },
    emergencyCases: {
      type: Number,
      default: 0
    },
    serviceDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "declined"],
      default: "pending"
    },
    statusMessage: {
      type: String,
      default: "Your booking request was sent to the caregiver."
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    ratingComment: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("CareRequest", CareRequestSchema);
