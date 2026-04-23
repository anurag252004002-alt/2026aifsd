console.log("🔥 RUNNING THIS FILE:", __filename);

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

// 🔹 Model import
const Student = require("./models/Student");
const Grievance = require("./models/Grievance");

// 🔹 MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ Mongo Error:", err));

// 🔹 Home route
app.get("/", (req, res) => {
  res.send("Server Running ✅");
});

// 🔹 TEST route
app.post("/test", (req, res) => {
  console.log("TEST API HIT");
  res.send("Test working ✅");
});

// 🔐 AUTH middleware
function auth(req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).send("Access Denied ❌");
  }

  try {
    const verified = jwt.verify(token, "secretkey");
    req.user = verified;
    next();
  } catch {
    res.status(400).send("Invalid Token ❌");
  }
}

// 🔹 REGISTER API
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await Student.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email already exists ❌");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Student({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.send("User Registered Successfully ✅");

  } catch (error) {
    res.status(500).send("Server Error ❌");
  }
});

// 🔐 LOGIN API
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Student.findOne({ email });
    if (!user) {
      return res.status(400).send("Invalid Email ❌");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Wrong Password ❌");
    }

    const token = jwt.sign(
      { id: user._id },
      "secretkey",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login Successful ✅",
      token: token
    });

  } catch (error) {
    res.status(500).send("Server Error ❌");
  }
});


// ============================
// 🔥 GRIEVANCE APIs START
// ============================

// ➤ POST: Submit grievance
app.post("/api/grievances", auth, async (req, res) => {
  try {
    const grievance = new Grievance({
      ...req.body,
      userId: req.user.id
    });

    await grievance.save();
    res.json(grievance);
  } catch {
    res.status(500).send("Error ❌");
  }
});

// ➤ GET: All grievances (user wise)
app.get("/api/grievances", auth, async (req, res) => {
  const data = await Grievance.find({ userId: req.user.id });
  res.json(data);
});

// ➤ GET: By ID
app.get("/api/grievances/:id", auth, async (req, res) => {
  const data = await Grievance.findById(req.params.id);
  res.json(data);
});

// ➤ PUT: Update grievance
app.put("/api/grievances/:id", auth, async (req, res) => {
  const data = await Grievance.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(data);
});

// ➤ DELETE grievance
app.delete("/api/grievances/:id", auth, async (req, res) => {
  await Grievance.findByIdAndDelete(req.params.id);
  res.send("Deleted ✅");
});

// ➤ SEARCH grievance
app.get("/api/grievances/search", auth, async (req, res) => {
  const data = await Grievance.find({
    title: { $regex: req.query.title, $options: "i" }
  });
  res.json(data);
});

// ============================
// 🔹 Server start
// ============================

app.listen(8000, () => {
  console.log("🚀 Server running on port 8000");
});