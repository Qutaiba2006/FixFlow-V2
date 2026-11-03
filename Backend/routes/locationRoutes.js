const express = require("express");
const {createLocation, getLocation} = require("../controllers/locationController");
const {authorize} = require("../middleware/AuthorizationMiddleware");
const {protect} = require("../middleware/AuthenticationMiddleware");
const router = express.Router();
router.post("/",protect,authorize("admin"),createLocation);
router.get("/",protect,getLocation);
module.exports=router;