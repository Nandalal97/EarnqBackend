const express = require("express");
const axios = require("axios");
const ImageKit = require("imagekit");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC,
  privateKey: process.env.IMAGEKIT_PRIVATE,
  urlEndpoint: process.env.IMAGEKIT_URL,
});

router.get("/video-url", async (req, res) => {
  const path = req.query.path;
  const token = req.query.token;
  const referer = req.get("referer");
  res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (!path || !token || token !== "abc123") {
    return res.status(403).send("Access denied (token)");
  }

  if (!referer || !referer.includes("http://localhost:5173")) {
    return res.status(403).send("Access denied");
  }

  try {
    const signedUrl = imagekit.url({
      path,
      signed: true,
      expireSeconds: 60,
    });

    const response = await axios.get(signedUrl, { responseType: "stream" });

    

    response.data.pipe(res);
  } catch (err) {
    console.error("❌ Streaming failed:", err.message);
    res.status(500).send("Streaming failed");
  }
});


module.exports = router;
