const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SALT = parseInt(process.env.SALT);
const JWT_SECRET = process.env.JWT_SECRET;

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Email already exists" });

    const hashed = await bcrypt.hash(password, SALT);
    const user = new User({ username, email, password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id, username, email }, JWT_SECRET);
    res.json({ token, username, email });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, username: user.username, email }, JWT_SECRET);
    res.json({ token, username: user.username, email });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
