const mongoose = require("mongoose");
const reportModel = require("../models/reportModel");
const validateReportId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: "Invalid Report ID",
    });
  }
  next();
};
const findReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await reportModel.findById(id);
    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }
    req.report = report;
    next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = { validateReportId, findReport };
