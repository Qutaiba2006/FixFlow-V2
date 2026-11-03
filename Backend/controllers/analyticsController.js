const reportModel = require("../models/reportModel");
const getAnalyticsSummary = async (req, res) => {
  try {
    const openReports = await reportModel.countDocuments({
      status: "open",
    });
    const progressReports = await reportModel.countDocuments({
      status: "in_progress",
    });
    const resolvedReports = await reportModel.countDocuments({
      status: "resolved",
    });
    const totalReports = await reportModel.countDocuments({});
    res.status(200).json({
      totalReports: totalReports,
      openReports: openReports,
      inProgressReports: progressReports,
      resolvedReports: resolvedReports,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = getAnalyticsSummary;
