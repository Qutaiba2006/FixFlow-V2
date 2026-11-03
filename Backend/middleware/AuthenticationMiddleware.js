const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const protect = async (req, res, next) => {
  const tokens = req.headers.authorization;
  if (tokens === undefined) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  const Bearer = tokens.split(" ")[0];
  if (Bearer !== "Bearer") {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  const part = tokens.split(" ");
  if (part.length !== 2) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  const token = part[1];
  if (token.trim() === "") {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECURE);
    const checkUser = await userModel.findById(decoded.id);
    if(!checkUser || checkUser.isActive===false){
        return res.status(401).json({
        message: "Unauthorized",
      });
    }
    req.user=checkUser;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};
module.exports = { protect };