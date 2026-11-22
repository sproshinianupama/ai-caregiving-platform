const mongoose = require("mongoose");

const ScheduleSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["Free", "Unavailable", "Cancelled", "Manual Booking"],
      default: "Free"
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const CaregiverScheduleSchema = new mongoose.Schema(
  {
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Caregiver",
      required: true
    },
    date: {
      type: String,
      required: true
    },
    slots: {
      type: [ScheduleSlotSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

CaregiverScheduleSchema.index({ caregiverId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("CaregiverSchedule", CaregiverScheduleSchema);
