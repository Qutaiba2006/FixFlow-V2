const {
  createReport,
  getReports,
  toggleSupport,
  toggleAffected,
  assignTechnician,
  updateStatus,
  getReportById,
  getMyReports,
  getAssignedReports,
  updateReport,
  deleteReport,
} = require("../controllers/reportController");
const { uploadReportImages } = require("../controllers/imageController");
const { protect } = require("../middleware/AuthenticationMiddleware");
const { authorize } = require("../middleware/AuthorizationMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  validateReportId,
  findReport,
} = require("../middleware/validateReport");
const express = require("express");
const router = express.Router();
router.post("/", protect, createReport);
router.get("/", protect, getReports);
router.patch(
  "/:id/support",
  protect,
  validateReportId,
  findReport,
  toggleSupport,
);
router.patch(
  "/:id/affected",
  protect,
  validateReportId,
  findReport,
  toggleAffected,
);
router.patch(
  "/:id/assign",
  protect,
  authorize("admin"),
  validateReportId,
  findReport,
  assignTechnician,
);
router.patch(
  "/:id/status",
  protect,
  authorize("admin", "technician"),
  validateReportId,
  findReport,
  updateStatus,
);
router.get("/mine", protect, getMyReports);
router.get("/assigned", protect, authorize("technician"), getAssignedReports);
router.get("/:id", protect, validateReportId, findReport, getReportById);
router.post(
  "/:id/images",
  protect,
  validateReportId,
  findReport,
  upload.array("images", 2),
  uploadReportImages,
);
router.patch("/:id", protect, validateReportId, findReport, updateReport);
router.delete("/:id", protect, validateReportId, findReport, deleteReport);
module.exports = router;
