const locationModel = require("../models/locationModel");
const createLocation = async (req, res) => {
  const {
    name,
    buildingCode,
    building,
    floor,
    roomNumber,
    mapCode,
    codeType,
    symbol,
  } = req.body || {};
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      message: "Location name is required",
    });
  }
  const optionalFields = {
    buildingCode,
    building,
    floor,
    roomNumber,
    mapCode,
    codeType,
    symbol,
  };
  for (const value of Object.values(optionalFields)) {
    if (value != null && typeof value !== "string") {
      return res.status(400).json({
        message: "Invalid location data",
      });
    }
  }
  const locationData = {
    name: name.trim(),
    buildingCode: buildingCode?.trim().toUpperCase(),
    building: building?.trim().toLowerCase(),
    floor: floor?.trim().toUpperCase(),
    roomNumber: roomNumber?.trim().toLowerCase(),
    mapCode: mapCode?.trim().toUpperCase(),
    codeType: codeType?.trim(),
    symbol: symbol?.trim(),
  };
  try {
    const existingLocation = await locationModel
      .findOne({
        name: locationData.name,
        buildingCode: locationData.buildingCode || null,
        building: locationData.building || null,
        floor: locationData.floor || null,
        roomNumber: locationData.roomNumber || null,
        mapCode: locationData.mapCode || null,
      })
      .collation({ locale: "en", strength: 2 });

    if (existingLocation) {
      return res.status(409).json({
        message: "Location already exists",
      });
    }
    const newLocation = await locationModel.create(locationData);
    return res.status(201).json({
      message: "Location created successfully",
      location: newLocation,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const getLocation = async (req, res) => {
  try {
    const locations = await locationModel.find().sort({ name: 1 });
    return res.status(200).json(locations);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
module.exports = { createLocation, getLocation };
