const mongoose = require("mongoose");
const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    supporters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    affectedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    timeline: [
      {
        action: {
          type: String,
          enum: ["created", "assigned", "status_changed"],
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        details: {
          type: String,
        },
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);
const reportModel = mongoose.model("Report", reportSchema);
module.exports = reportModel;
