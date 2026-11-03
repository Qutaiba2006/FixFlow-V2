const bcryptjs = require("bcryptjs");
const validator = require("validator");
const userModel = require("../models/user");
const protect = require("../middleware/AuthenticationMiddleware");
const jwt = require("jsonwebtoken");
const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (
    typeof email !== "string" ||
    email.trim() === "" ||
    typeof password !== "string" ||
    password.trim() === ""
  ) {
    return res.status(400).json({
      message: "Invalid data",
    });
  }
  try {
    if (!validator.isEmail(email.trim().toLocaleLowerCase())) {
      return res.status(401).json({
        message: "incorect email or passoword",
      });
    }
    const checkUser = await userModel.findOne({
      email: email.trim().toLocaleLowerCase(),
    });
    if (!checkUser) {
      return res.status(401).json({
        message: "incorect email or passoword",
      });
    }
    const checkPassowrd = await bcryptjs.compare(
      password,
      checkUser.passwordHash,
    );
    if (!checkPassowrd) {
      return res.status(401).json({
        message: "incorect email or passoword",
      });
    }
    if (checkUser.isActive === false) {
      return res.status(401).json({
        message: "incorrect email or password",
      });
    }
    const tokens = jwt.sign({ id: checkUser._id }, process.env.JWT_SECURE, {
      expiresIn: "1h",
    });
    res.status(200).json({
      message: "Successful login",
      user: {
        id: checkUser._id,
        name: checkUser.name,
        email: checkUser.email,
        role: checkUser.role,
      },
      token: tokens,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error server",
    });
  }
};
const getMe = (req, res) => {
  res.status(200).json({
    user:{
        id:req.user.id,
        name:req.user.name,
        email:req.user.email,
        role:req.user.role
    }
  });
};
module.exports = { login, getMe };
