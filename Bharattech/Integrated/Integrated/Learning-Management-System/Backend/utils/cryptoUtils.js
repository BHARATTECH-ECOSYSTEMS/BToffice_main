const crypto = require("crypto");

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-for-encryption-1234567890";

function encryptPassword(password) {
  const key = crypto.createHash("sha256").update(JWT_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptPassword(encryptedData) {
  const key = crypto.createHash("sha256").update(JWT_SECRET).digest();
  const parts = String(encryptedData || "").split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted password format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function generateTemporaryPassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

module.exports = {
  encryptPassword,
  decryptPassword,
  generateTemporaryPassword,
};
