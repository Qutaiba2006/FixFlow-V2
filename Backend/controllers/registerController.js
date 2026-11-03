const bcryptjs = require("bcryptjs");
const validator = require("validator");
const userModel = require("../models/user");
const register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof email !== "string" ||
    email.trim() === "" ||
    typeof password !== "string" ||
    password.trim() === ""
  ) {
    return res.status(400).json({
      message: "All fields are required and must be valid strings",
    });
  }
  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters",
    });
  }
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }
    const checkUser = await userModel.findOne({ email: normalizedEmail });
    if (checkUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }
    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = await userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
    });
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error.message);
    console.log("500 Internal Server Error");
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = { register };