const { login, getMe } = require("../controllers/loginController");
const { protect } = require("../middleware/AuthenticationMiddleware");
const { authorize } = require("../middleware/AuthorizationMiddleware");
const express = require("express");
const router = express.Router();
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    message: "Welcome Admin",
  });
});
module.exports = router;
