const mongoose = require("mongoose");
const location = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    buildingCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    building: {
      type: String,
      trim: true,
      lowercase: true,
    },
    floor: {
      type: String,
      trim: true,
      uppercase: true,
    },
    roomNumber: {
      type: String,
      trim: true,
      lowercase: true,
    },
    mapCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    codeType: {
      type: String,
      trim: true,
    },
    symbol: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);
const locationModel = mongoose.model("Location", location);
module.exports = locationModel;
