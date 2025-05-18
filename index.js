// index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT;


// Middlewares
app.use(cors());
app.use(express.json());

// Environment Variables
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT = process.env.SALT;

app.use("/assets", express.static(path.join(__dirname, "assets")));

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Mongoose Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

// API: Register
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, Number(SALT));
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ email, username }, JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({ token, email, username });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// API: Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, email: user.email, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// New API endpoint to send contact form email
app.post("/send-contact-email", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  try {
const emailHTML = `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width:600px; margin:auto; 
    border:1px solid #e0e0e0; 
    border-radius:16px; 
    padding:30px; 
    background:#ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  ">
    <div style="text-align:center; margin-bottom:25px;">
      <img src="cid:logo" alt="Virtua Mod Logo" style="
        width:100px; 
        height:100px; 
        object-fit:cover; 
        border-radius:50%; 
        margin-bottom:15px; 
        box-shadow: 0 2px 8px rgba(79,70,229,0.3);
      "/>
      <h2 style="
        color:#4F46E5; 
        margin-bottom:8px; 
        font-weight:700; 
        font-size:24px;
      ">📬 New Contact Form Submission</h2>
      <p style="
        color:#6b7280; 
        font-size:15px; 
        margin-top:0; 
        font-weight:500;
      ">from <strong>Virtua Mod</strong> website 🌐</p>
    </div>
    <div style="color:#111827; font-size:16px; line-height:1.6;">
      <p>👤 <strong>Name:</strong> ${name}</p>
      <p>📧 <strong>Email:</strong> <a href="mailto:${email}" style="color:#4F46E5; text-decoration:none;">${email}</a></p>
      <p>💬 <strong>Message:</strong></p>
      <p style="
        background:#f9fafb; 
        padding:20px; 
        border-radius:12px; 
        font-style:italic; 
        color:#374151;
        box-shadow: inset 0 0 5px #e0e0e0;
      ">${message}</p>
    </div>
    <hr style="margin:35px 0; border:none; border-top:1px solid #e5e7eb;" />
    <footer style="text-align:center; font-size:13px; color:#9ca3af; line-height:1.4;">
      <p style="margin:0 0 6px 0;">
        Virtua Mod &nbsp;&bull;&nbsp; 
        <a href="mailto:contact@virtuamod.com" style="color:#4F46E5; text-decoration:none;">✉️ contact@virtuamod.com</a> &nbsp;&bull;&nbsp; 📞 +92 300 1234567
      </p>
      <p style="margin:0;">
        <a href="https://www.virtuamod.com" target="_blank" style="color:#4F46E5; text-decoration:none; font-weight:600;">
          🌍 www.virtuamod.com
        </a>
      </p>
    </footer>
  </div>
`;


    await transporter.sendMail({
      from: `"Virtua Mod Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Contact Form Submission from ${name}`,
      html: emailHTML,
      attachments: [
        {
          filename: "logo.png",
          path: path.join(__dirname, "logo.png"),
          cid: "logo",
        },
      ],
    });

    res.json({ message: "Email sent successfully." });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});



app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
