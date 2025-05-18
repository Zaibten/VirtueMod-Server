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
      <img src="cid:logo" alt="Virtue Mod Logo" style="
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
      ">from <strong>Virtue Mod</strong> website 🌐</p>
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
        Virtue Mod &nbsp;&bull;&nbsp; 
        <a href="mailto:contact@Virtuemod.com" style="color:#4F46E5; text-decoration:none;">✉️ contact@Virtuemod.com</a> &nbsp;&bull;&nbsp; 📞 +92 300 1234567
      </p>
      <p style="margin:0;">
        <a href="https://www.Virtuemod.com" target="_blank" style="color:#4F46E5; text-decoration:none; font-weight:600;">
          🌍 www.Virtuemod.com
        </a>
      </p>
    </footer>
  </div>
`;


    await transporter.sendMail({
      from: `"Virtue Mod Contact" <${process.env.EMAIL_USER}>`,
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

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Virtue Mod Server Dashboard</title>
      <link rel="icon" href="assets/images/logo.png">
      <script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');
        body {
          margin: 0;
          font-family: 'Montserrat', sans-serif;
          background-color: #1e1e2f;
          color: #e4e4e4;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }
        .particle-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
        }
        .dashboard-container {
          width: 90%;
          max-width: 1200px;
          padding: 30px;
          background-color: #2b2b3d;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          margin: 30px auto;
          flex-grow: 1;
          animation: fadeIn 1.2s ease-in-out;
          z-index: 1;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .header img {
          height: 100px;
          width: 100px;
          border-radius: 50%;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 36px;
          color: #fff;
          font-weight: 700;
          margin: 0;
        }
        .header p {
          font-size: 18px;
          color: #bbb;
          margin-top: 5px;
          text-align: center;
        }
        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }
        .cards {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .card {
          background: linear-gradient(145deg, #3b3b4f, #242435);
          padding: 20px;
          border-radius: 10px;
          box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.3), 0 5px 15px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border-left: 5px solid #ff7f50;
        }
        .card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }
        .card h3 {
          font-size: 24px;
          color: #ffcc00;
          margin-bottom: 10px;
        }
        .card p {
          font-size: 16px;
          color: #ddd;
        }
        .recent-activities {
          background: linear-gradient(145deg, #41415b, #2c2c3d);
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        .recent-activities h2 {
          font-size: 28px;
          margin-bottom: 15px;
          color: #ffcc00;
        }
        .recent-activities ul {
          padding-left: 20px;
        }
        .recent-activities li {
          font-size: 16px;
          color: #ddd;
          margin-bottom: 10px;
        }
        .statistics {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          margin-top: 40px;
        }
        .stat-card {
          background: linear-gradient(145deg, #41415b, #2c2c3d);
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          width: 30%;
          text-align: center;
        }
        .stat-card h3 {
          font-size: 30px;
          color: #ffcc00;
        }
        .stat-card p {
          font-size: 16px;
          color: #ddd;
        }
        .team-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-around;
          gap: 20px;
          flex-wrap: wrap;
        }
        .team-member {
          background: linear-gradient(145deg, #3b3b4f, #242435);
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          text-align: center;
          width: 200px;
          margin-bottom: 20px;
        }
        .team-member img {
          border-radius: 50%;
          width: 80px;
          height: 80px;
          margin-bottom: 15px;
        }
        .team-member h4 {
          color: #ffcc00;
          font-size: 20px;
          margin-bottom: 10px;
        }
        .team-member p {
          color: #ddd;
          font-size: 16px;
        }
        footer {
          background-color: #282836;
          color: #999;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          border-top: 2px solid #444;
        }
        footer p {
          margin: 0;
        }
        footer a {
          color: #ff7f50;
          text-decoration: none;
          font-weight: 500;
        }

        /* Responsive Styles */
        @media (max-width: 900px) {
          .main-content {
            grid-template-columns: 1fr;
          }
          .statistics {
            flex-direction: column;
            gap: 20px;
          }
          .stat-card {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .header img {
            height: 80px;
            width: 80px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 28px;
          }
          .header p {
            font-size: 14px;
          }
          .card h3 {
            font-size: 20px;
          }
          .card p,
          .recent-activities li,
          .stat-card p,
          .team-member p {
            font-size: 14px;
          }
          .recent-activities h2 {
            font-size: 22px;
          }
          .team-member {
            width: 140px;
            padding: 15px;
          }
          .team-member h4 {
            font-size: 16px;
          }
          .team-member img {
            width: 60px;
            height: 60px;
            margin-bottom: 10px;
          }
          .dashboard-container {
            padding: 20px 15px;
            width: 95%;
          }
        }
      </style>
    </head>
    <body>
      <div id="particle-container" class="particle-container"></div>
      <div class="dashboard-container">
        <div class="header">
          <img src="assets/images/logo.png" alt="App Logo" />
          <div>
            <h1>Virtue Mod Server Dashboard</h1>
            <p>Smart Artificial Intelligence</p>
          </div>
        </div>
        <div class="main-content">
          <div class="cards">
            <div class="card">
              <h3>User Engagement</h3>
              <p>Track user activities in real-time and analyze trends.</p>
            </div>
            <div class="card">
              <h3>Performance</h3>
              <p>Analyze performance metrics and improve efficiency.</p>
            </div>
          </div>
          <div class="recent-activities">
            <h2>Recent Activities</h2>
            <ul>
              <li>Updated privacy policy on 1st May 2025</li>
              <li>New feature "Dark Mode" released</li>
              <li>Performance optimization completed</li>
            </ul>
          </div>
        </div>
        <div class="statistics">
          <div class="stat-card">
            <h3>Users</h3>
            <p>10,000</p>
          </div>
          <div class="stat-card">
            <h3>Active Users</h3>
            <p>7,500</p>
          </div>
          <div class="stat-card">
            <h3>Total Revenue</h3>
            <p>$50,000</p>
          </div>
        </div>
        <div class="team-section">
          <div class="team-member">
            <img src="https://png.pngtree.com/png-clipart/20190520/original/pngtree-vector-users-icon-png-image_4144740.jpg" alt="Team Member 1" />
            <h4>Taha Bin Arshad</h4>
            <p>Backend Developer</p>
          </div>
          <div class="team-member">
            <img src="https://png.pngtree.com/png-clipart/20190520/original/pngtree-vector-users-icon-png-image_4144740.jpg" alt="Team Member 2" />
            <h4>Shayan Ahmed</h4>
            <p>UI/UX Designer</p>
          </div>
          <div class="team-member">
            <img src="https://png.pngtree.com/png-clipart/20190520/original/pngtree-vector-users-icon-png-image_4144740.jpg" alt="Team Member 3" />
            <h4>Muneera Rehman</h4>
            <p>Project Manager</p>
          </div>
        </div>
        <footer>
          <p>&copy; 2025 Virtue Mod. All rights reserved. <a href="#">Terms</a> | <a href="#">Privacy Policy</a></p>
        </footer>
      </div>
      <script>
        particlesJS("particle-container", {
          particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            shape: { type: "circle" },
            opacity: { value: 0.5 },
            size: { value: 3 },
            line_linked: { enable: true, color: "#fff", opacity: 0.5, width: 2 },
          },
          interactivity: {
            events: {
              onhover: { enable: true, mode: "repulse" },
            },
          },
       
});
</script>
</body>
</html>
`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
