const getAnalyticsSummary = require("../controllers/analyticsController");
const { protect } = require("../middleware/AuthenticationMiddleware");
const { authorize } = require("../middleware/AuthorizationMiddleware");
const express = require("express");
const router = express.Router();
router.get("/summary",protect,authorize("admin"),getAnalyticsSummary);
module.exports = router;