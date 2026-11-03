const mongoose = require("mongoose");
const locationModel = require("../models/locationModel");
const reportModel = require("../models/reportModel");
const userModel = require("../models/user");
const cloudinary = require("../config/cloudinary");
const { sendEmail } = require("../services/emailService");
const createReport = async (req, res) => {
  const { title, description, location } = req.body || {};
  if (
    typeof title !== "string" ||
    title.trim().length < 5 ||
    typeof description !== "string" ||
    description.trim().length < 10
  ) {
    return res.status(400).json({
      message: "Invalid Data",
    });
  }
  if (!mongoose.isValidObjectId(location)) {
    return res.status(400).json({
      message: "Invalid Data",
    });
  }
  try {
    const checkLocation = await locationModel.findById(location);
    if (!checkLocation) {
      return res.status(404).json({
        message: "Location Not Found",
      });
    }
    const newReport = await reportModel.create({
      title: title,
      description: description,
      location: location,
      reportedBy: req.user._id,
      timeline: [
        {
          action: "created",
          performedBy: req.user._id,
          details: "Report submitted",
        },
      ],
    });
    res.status(201).json({
      message: "Report is created",
      report: newReport,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
const getReports = async (req, res) => {
  try {
    const foundReports = await reportModel
      .find()
      .populate("reportedBy", "name")
      .populate("location", "name buildingCode floor")
      .sort({ priorityScore: -1, createdAt: -1 });
    res.status(200).json(foundReports);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const toggleInteraction = (report, field, userId) => {
  const alreadyInteracted = report[field].some((user) => user.equals(userId));
  if (alreadyInteracted) {
    report[field].pull(userId);
  } else {
    report[field].push(userId);
  }
  report.priorityScore =
    report.supporters.length * 2 + report.affectedUsers.length * 5;
  return report;
};
const toggleSupport = async (req, res) => {
  try {
    const findReport = toggleInteraction(
      req.report,
      "supporters",
      req.user._id,
    );
    await findReport.save();
    res.status(200).json({
      message: "Support updated successfully",
      supportCount: findReport.supporters.length,
      affectedCount: findReport.affectedUsers.length,
      priorityScore: findReport.priorityScore,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const toggleAffected = async (req, res) => {
  try {
    const findReport = toggleInteraction(
      req.report,
      "affectedUsers",
      req.user._id,
    );
    await findReport.save();
    res.status(200).json({
      message: "Affected updated successfully",
      affectedCount: findReport.affectedUsers.length,
      supportCount: findReport.supporters.length,
      priorityScore: findReport.priorityScore,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const assignTechnician = async (req, res) => {
  try {
    const { technicianId } = req.body || {};
    if (!mongoose.isValidObjectId(technicianId)) {
      return res.status(400).json({
        message: "Invalid technician ID",
      });
    }
    const checkUser = await userModel.findById(technicianId);
    if (!checkUser) {
      return res.status(404).json({
        message: "Technician not found",
      });
    }
    if (checkUser.role !== "technician" || !checkUser.isActive) {
      return res.status(400).json({
        message: "User is not an active technician",
      });
    }
    req.report.assignedTo = checkUser._id;
    req.report.timeline.push({
      action: "assigned",
      performedBy: req.user._id,
      details: "Technician assigned",
    });
    await req.report.save();
    try {
      await sendEmail(
        checkUser.email,
        "FixFlow - New Maintenance Assignment",
        `Hello ${checkUser.name},
         You have been assigned a new maintenance report.
          Report: ${req.report.title}
          Report ID: ${req.report._id}
          Please log in to FixFlow to view the details.
          FixFlow Team`,
      );
    } catch (emailError) {
      console.error("Failed to send assignment email:", emailError.message);
    }
    return res.status(200).json({
      message: "Technician assigned successfully",
      report: req.report,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const allowedStatuses = ["open", "in_progress", "resolved"];
    const { status } = req.body || {};

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const isAdmin = req.user.role === "admin";

    const isAssignedTechnician =
      req.user.role === "technician" &&
      req.report.assignedTo?.equals(req.user._id);

    if (!isAdmin && !isAssignedTechnician) {
      return res.status(403).json({
        message: "You do not have permission to update this report",
      });
    }

    if (req.report.status === status) {
      return res.status(200).json({
        message: "Report already has this status",
        status,
      });
    }

    req.report.status = status;

    req.report.timeline.push({
      action: "status_changed",
      performedBy: req.user._id,
      details: `Status changed to ${status}`,
    });

    await req.report.save();

    if (status === "in_progress" || status === "resolved") {
      try {
        const reportOwner = await userModel
          .findById(req.report.reportedBy)
          .select("name email");
        if (reportOwner?.email) {
          const subject =
            status === "resolved"
              ? "FixFlow - Your Report Was Resolved"
              : "FixFlow - Maintenance Started";
          const message =
            status === "resolved"
              ? "Your maintenance report has been resolved."
              : "A technician has started working on your report.";
          await sendEmail(
            reportOwner.email,
            subject,
            `Hello ${reportOwner.name},
              ${message}
              Report: ${req.report.title}
              Report ID: ${req.report._id}
              Current Status: ${status}
              You can log in to FixFlow to view the details.
              FixFlow Team`,
          );
        }
      } catch (emailError) {
        console.error("Failed to send status email:", emailError.message);
      }
    }
    return res.status(200).json({
      message: "Status changed successfully",
      status: req.report.status,
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getReportById = async (req, res) => {
  try {
    await req.report.populate("location", "name buildingCode floor");
    res.status(200).json({
      report: req.report,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const getMyReports = async (req, res) => {
  try {
    const reports = await reportModel
      .find({
        reportedBy: req.user._id,
      })
      .populate("location", "name buildingCode floor")
      .sort({ createdAt: -1 });
    return res.status(200).json(reports);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const getAssignedReports = async (req, res) => {
  try {
    const reports = await reportModel
      .find({ assignedTo: req.user._id })
      .populate("location", "name buildingCode floor");
    res.status(200).json(reports);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const updateReport = async (req, res) => {
  try {
    const report = req.report;
    const { title, description } = req.body || {};
    if (
      typeof title !== "string" ||
      title.trim().length < 5 ||
      typeof description !== "string" ||
      description.trim().length < 10
    ) {
      return res.status(400).json({
        message: "The title or descrebtion is empty",
      });
    }
    if (String(req.user._id) !== String(report.reportedBy._id)) {
      return res.status(403).json({
        message: "You are not allowed to change this report",
      });
    }
    if (report.status !== "open") {
      return res.status(409).json({
        message: "You are not allowed to change this report",
      });
    }
    report.title = title.trim();
    report.description = description.trim();
    await report.save();
    res.status(200).json({
      message: "Report was updated",
      report,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const deleteReport = async (req, res) => {
  try {
    const report = req.report;
    if (String(req.user._id) !== String(report.reportedBy._id)) {
      return res.status(403).json({
        message: "You are not allowed to delete this report",
      });
    }
    if (report.status !== "open") {
      return res.status(409).json({
        message: "Only open reports can be deleted",
      });
    }
    for (const image of report.images) {
      const result = await cloudinary.uploader.destroy(image.publicId, {
        invalidate: true,
      });
      if (result.result !== "ok" && result.result !== "not found") {
        throw new Error("Failed to delete image from Cloudinary");
      }
    }
    await report.deleteOne();
    res.status(200).json({
      message: "The report was deleted",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = {
  createReport,
  getReports,
  toggleSupport,
  toggleAffected,
  assignTechnician,
  updateStatus,
  getReportById,
  getMyReports,
  getAssignedReports,
  updateReport,
  deleteReport,
};
