const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "venues.json");
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
const venues = payload.venues;

const required = [
  "id",
  "name",
  "area",
  "type",
  "lat",
  "lng",
  "americanoPrice",
  "parkingSummary",
  "freeOrSupportedParking",
  "confidence",
  "scores",
  "notes",
  "mapQuery",
  "sources"
];

const scoreKeys = ["work", "parkingBenefit", "parkingCapacity", "weekendCalm", "access", "lunch", "capacity"];
const ids = new Set();
const errors = [];

function fail(id, message) {
  errors.push(`${id || "unknown"}: ${message}`);
}

for (const venue of venues) {
  for (const key of required) {
    if (!(key in venue)) fail(venue.id, `missing ${key}`);
  }

  if (ids.has(venue.id)) fail(venue.id, "duplicate id");
  ids.add(venue.id);

  if (typeof venue.lat !== "number" || venue.lat < 37.15 || venue.lat > 37.36) {
    fail(venue.id, `lat out of Yongin/Suwon review bounds: ${venue.lat}`);
  }
  if (typeof venue.lng !== "number" || venue.lng < 126.9 || venue.lng > 127.35) {
    fail(venue.id, `lng out of Yongin/Suwon review bounds: ${venue.lng}`);
  }
  if (typeof venue.americanoPrice !== "number" || venue.americanoPrice < 1000 || venue.americanoPrice > 9000) {
    fail(venue.id, `americanoPrice suspicious: ${venue.americanoPrice}`);
  }

  for (const key of scoreKeys) {
    const value = venue.scores && venue.scores[key];
    if (typeof value !== "number" || value < 1 || value > 10) {
      fail(venue.id, `score ${key} must be 1..10`);
    }
  }

  if (!Array.isArray(venue.sources) || venue.sources.length === 0) {
    fail(venue.id, "at least one source is required");
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: ${venues.length} venues validated`);
