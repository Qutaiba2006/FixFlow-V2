const getHealth = require("../controllers/healthController");
const express = require("express");
const router = express.Router();
router.get("/",getHealth);
module.exports = router;
