const express = require("express");
const crypto = require("crypto");
const ImageKit = require("imagekit");
const router = express.Router();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC,
  privateKey: process.env.IMAGEKIT_PRIVATE,
  urlEndpoint: process.env.IMAGEKIT_URL,
});

const tokens = new Map(); // Temporary store in memory

// Generate random secure token
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

router.get("/get-secure-video-url", (req, res) => {
  const path = req.query.path;

  if (!path) return res.status(400).json({ error: "Missing video path" });

  const token = generateToken();
  tokens.set(token, { path, expiresAt: Date.now() + 60 * 1000 }); // Expires in 60 sec

  const securedUrl = `http://localhost:5000/api/secure-video?path=${encodeURIComponent(
    path
  )}&token=${token}`;

  res.json({ url: securedUrl });
});

module.exports = router;

// Later use `tokens.get(token)` to verify before streaming
module.exports.tokens = tokens;
