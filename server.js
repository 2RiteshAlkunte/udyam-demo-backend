// backend/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: ["http://localhost:3000",  "https://udyam-demo-backend.onrender.com"],
    credentials: true
}));
app.use(bodyParser.json());


// MongoDB Connection

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Models
const otpSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  aadhaar: String,
  name: String,
  createdAt: { type: Date, default: Date.now, expires: 300 } // expires in 300s (5min)
});
const OTP = mongoose.model("OTP", otpSchema);

const submissionSchema = new mongoose.Schema({
  aadhaar: String,
  name: String,
  mobile: String,
  pan: String,
  pin: String,
  city: String,
  state: String,
  country: String,
  createdAt: { type: Date, default: Date.now }
});
const Submission = mongoose.model("Submission", submissionSchema);

// /send-otp
app.post("/send-otp", async (req, res) => {
  try {
    const { mobile, aadhaar, name } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ ok: false, error: "Invalid mobile" });
    }

 const otp = "123456";
    console.log(`📩 (mock) send OTP ${otp} to ${mobile}`);

    // Save OTP record
    await OTP.create({ mobile, otp, aadhaar: aadhaar || "", name: name || "" });

    // return success 
    return res.json({ ok: true, message: "OTP sent (mock)" });
  } catch (err) {
    console.error("send-otp error:", err);
    return res.status(500).json({ ok: false, error: "Failed to send OTP" });
  }
});

// /verify-otp
// Verifies OTP against DB and deletes the record on success
app.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile) || !otp) {
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    // Find matching OTP
    const record = await OTP.findOne({ mobile, otp });
    if (!record) {
      return res.status(400).json({ ok: false, error: "Invalid or expired OTP" });
    }

    // Delete OTP (so it can't be reused)
    await OTP.deleteOne({ _id: record._id });

    return res.json({ ok: true, message: "OTP verified" });
  } catch (err) {
    console.error("verify-otp error:", err);
    return res.status(500).json({ ok: false, error: "Error verifying OTP" });
  }
});

// /submit
// Accepts { aadhaar, name, mobile, pan, pin, city, state, country }
app.post("/submit", async (req, res) => {
  try {
    const payload = req.body || {};
    const { aadhaar, name, mobile, pan, pin, city, state, country } = payload;

    // Basic server side validation (
    if (!/^\d{12}$/.test(String(aadhaar || ""))) {
      return res.status(400).json({ ok: false, error: "Invalid Aadhaar" });
    }
    if (!name || !/^[A-Za-z\s]{2,100}$/.test(name)) {
      return res.status(400).json({ ok: false, error: "Invalid name" });
    }
    if (!/^\d{10}$/.test(String(mobile || ""))) {
      return res.status(400).json({ ok: false, error: "Invalid mobile" });
    }
    if (!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(String(pan || ""))) {
      return res.status(400).json({ ok: false, error: "Invalid PAN" });
    }

    const saved = await Submission.create({
      aadhaar,
      name,
      mobile,
      pan,
      pin,
      city,
      state,
      country
    });

    console.log("✅ Submission saved:", saved._id);
    return res.json({ ok: true, message: "Submission saved", id: saved._id });
  } catch (err) {
    console.error("submit error:", err);
    return res.status(500).json({ ok: false, error: "Failed to save submission" });
  }
});


app.get("/submissions", async (req, res) => {
  try {
    const list = await Submission.find().sort({ createdAt: -1 }).limit(200);
    return res.json({ ok: true, submissions: list });
  } catch (err) {
    console.error("submissions error:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch submissions" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
