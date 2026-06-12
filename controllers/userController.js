const User = require("../models/userModel");
const Otp = require("../models/otpModel");

const bcrypt = require("bcryptjs");


const jwt = require("jsonwebtoken");

const generateOTP = require("../utils/genOtp");



exports.register = async (req, res) => {
  try {
    console.log("========== REGISTER HIT ==========");

    console.log("BODY:", req.body);
    console.log("FILE RAW:", req.file);

    if (!req.file) {
      console.log("❌ NO FILE RECEIVED BY MULTER");

      return res.status(400).json({
        success: false,
        message: "Profile photo is required",
      });
    }

    console.log("FILE PATH:", req.file.path);

    const { countryCode, phone, email, password } = req.body;

    const fullPhone = countryCode + phone;

    console.log("FULL PHONE:", fullPhone);

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("PASSWORD HASHED");

    const user = await User.create({
      countryCode,
      phone: fullPhone,
      email,
      password: hashedPassword,
      profilePhoto: req.file.path,
    });

    console.log("USER CREATED:", user._id);

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("TOKEN GENERATED");

    return res.status(201).json({
      success: true,
      message: "Registration Successful",
      token,
      user,
    });

  } catch (error) {
    console.log("🔥 REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.login = async (req, res) => {
  try {
    const {  email,countryCode, phone, password } =
      req.body;

    const fullPhone = countryCode + phone;

    const user = await User.findOne({
      phone: fullPhone,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
exports.sendOtp = async (req, res) => {
  try {
    const { countryCode, phone } = req.body;

    const otp = generateOTP();

    console.log("OTP :", otp);

    await Otp.create({
      phone: countryCode + phone,
      otp,
      expiresAt: Date.now() + 300000,
    });

    res.status(200).json({
      success: true,
      message: "OTP Sent",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { countryCode, phone, otp } =
      req.body;

    const otpData = await Otp.findOne({
      phone: countryCode + phone,
      
    });

    if (!otpData) {
      return res.status(400).json({
        message: "Invalid phone",
      });
    }
    if (otpData.otp !== otp) {
  return res.status(400).json({
    success: false,
    message: "Invalid OTP",
  });
}

    let user = await User.findOne({
      phone: countryCode + phone,
    });

    if (!user) {
      user = await User.create({
        phone: countryCode + phone,
        countryCode,
        isVerified: true,
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.loginWithPassword = async (
  req,
  res
) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({
      phone,
    });

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Wrong Password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};