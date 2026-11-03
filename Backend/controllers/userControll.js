const userModel = require("../models/user");
const getTechnicians = async (req, res) => {
  try {
    const technicians = await userModel
      .find({ role: "technician", isActive: true })
      .select("name email");
      res.status(200).json(technicians);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = getTechnicians;