const express = require("express");
const router = express.Router();
const getTechnicians = require("../controllers/userControll");
const { protect } = require("../middleware/AuthenticationMiddleware");
const { authorize } = require("../middleware/AuthorizationMiddleware");
router.get(
  "/technicians",
  protect,
  authorize("admin"),
  getTechnicians
);

module.exports = router;