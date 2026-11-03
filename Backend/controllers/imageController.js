const cloudinary = require("../config/cloudinary");
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "fixflow/reports" },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );
    stream.end(buffer);
  });
};
const uploadReportImages = async (req, res) => {
  try {
    if (!req.report.reportedBy.equals(req.user._id)) {
      return res.status(403).json({
        message: "You not allowed to upload photos",
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No images provided",
      });
    }
    if (req.report.images.length + req.files.length > 2) {
      return res.status(400).json({
        message: "Maximum 2 images per report",
      });
    }
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer);
      req.report.images.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }
    await req.report.save();
    res.status(201).json({
      message: "Images uploaded successfully",
      images: req.report.images,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = { uploadReportImages };
