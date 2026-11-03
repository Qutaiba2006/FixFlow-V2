
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const authRouters = require("./routes/registerRout");
const login = require("./routes/loginRout");
const location = require("./routes/locationRoutes");
const report = require("./routes/ReportRoutes");
const userRoutes = require("./routes/userRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://fix-flow-one-green.vercel.app",
    ],
  })
);

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRouters);
app.use("/api/auth", login);
app.use("/api/locations", location);
app.use("/api/reports", report);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

startServer();