const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const Location = require("../models/locationModel");
const locations = require("../data/campusLocations.json");
async function main() {
  if (!process.env.MONGO_URI)
    throw new Error("Missing MONGO_URI in Backend/.env");
  await mongoose.connect(process.env.MONGO_URI);
  const operations = locations.map((place) => ({
    updateOne: {
      filter: {
        name: place.name,
        buildingCode: place.buildingCode ?? null,
        floor: place.floor ?? null,
        mapCode: place.mapCode ?? null,
        symbol: place.symbol ?? null,
      },
      update: { $setOnInsert: place },
      upsert: true,
    },
  }));
  const result = await Location.bulkWrite(operations, { ordered: false });
  console.log(
    `Processed ${locations.length}; inserted ${result.upsertedCount}; matched ${result.matchedCount}`,
  );
}
main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
