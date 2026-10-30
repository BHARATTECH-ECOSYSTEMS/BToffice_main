// Loaded before every test file (package.json: node --test --import ./tests/setup.js).

// The tests' clock is UTC, not India's: code that slips back to the device's clock then fails here too, even on a
// laptop in India, where the device's clock and India's are the same.
process.env.TZ = "UTC";
