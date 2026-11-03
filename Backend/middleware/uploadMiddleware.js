const multer = require("multer");
const storage = multer.memoryStorage();
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const fileFilter = (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid image type"));
  }
    cb(null, true);

};
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
module.exports = upload;
