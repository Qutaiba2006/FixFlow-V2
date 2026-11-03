const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase:true
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "technician", "admin"],
      default: "student",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    department: {
      type: String,
    },
    phone: {
      type: String,
    },
  },
  { timestamps: true },
);
const userModel = mongoose.model("User", userSchema);
module.exports = userModel;
