const User = require("../models/userModel");
const Otp = require("../models/otpModel");

const bcrypt = require("bcryptjs");

const Token=require("../models/tokenModel");
const jwt = require("jsonwebtoken");

const generateOTP = require("../utils/genOtp");



exports.register = async (req, res) => {
  try {
    const { countryCode, phone, email, password } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile photo is required",
      });
    }

    const fullPhone = countryCode + phone;

    const phoneExists = await User.findOne({
      phone: fullPhone,
    });

    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone already registered",
      });
    }

    const emailExists = await User.findOne({
      email,
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }
  

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      countryCode,
      phone: fullPhone,
      email,
      password: hashedPassword,
      profilePhoto: req.file.path,
    });

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await Token.create({
      userId: user._id,
      token: jwtToken,
    });

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      token: jwtToken,
      user,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { countryCode, phone, password } =
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

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await Token.create({
      userId: user._id,
      token: jwtToken,
    });

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token: jwtToken,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.sendOtp = async (req, res) => {
  try {
    const { countryCode, phone } = req.body;

    const fullPhone =
      countryCode.trim() + phone.trim();

    const otp = generateOTP();

    await Otp.deleteMany({
      phone: fullPhone,
    });

    await Otp.create({
      phone: fullPhone,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log("Saved OTP:", otp);

    res.status(200).json({
      success: true,
      message: "OTP Sent Successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getUserTokens = async (req, res) => {
  try {
    const userId = req.params.userId.trim();

    const tokens = await Token.find({
      userId,
    });

    res.status(200).json({
      success: true,
      tokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.verifyOtp = async (req, res) => {
  try {
    const { countryCode, phone, otp } = req.body;

    const fullPhone =
      countryCode.trim() + phone.trim();

    console.log("Full Phone:", fullPhone);
    console.log("OTP:", otp);

    const otpData = await Otp.findOne({
      phone: fullPhone,
      otp,
    });

    console.log("OTP DATA:", otpData);

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "Invalid Phone or OTP",
      });
    }

    if (otpData.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP Expired",
      });
    }

    let user = await User.findOne({
      phone: fullPhone,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Mark user verified
    user.isVerified = true;
    await user.save();

    // Delete used OTP
    await Otp.deleteMany({
      phone: fullPhone,
    });

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Save token in Token collection
    await Token.create({
      userId: user._id,
      token: jwtToken,
    });

    return res.status(200).json({
      success: true,
      message: "OTP Verified Successfully",
      token: jwtToken,
      user,
    });

  } catch (error) {
    console.log("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
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
const sendEmail = require("../utils/sendEmail");

exports.forgotPasswordSendOtp =
  async (req, res) => {
    try {
      const { email } = req.body;

      const user =
        await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const otp = generateOTP();

      await Otp.deleteMany({ email });

      await Otp.create({
        email,
        otp,
        expiresAt:
          Date.now() + 5 * 60 * 1000,
      });

      await sendEmail(
        email,
        "Password Reset OTP",
        `Your OTP is ${otp}`
      );

      res.status(200).json({
        success: true,
        message:
          "OTP sent to email",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
  exports.resetPassword =
  async (req, res) => {
    try {
      const {
        email,
        otp,
        newPassword,
      } = req.body;

      const otpData =
        await Otp.findOne({
          email,
          otp,
        });

      if (!otpData) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      if (
        otpData.expiresAt <
        Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "OTP Expired",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      const passwordRegex =
      /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Z].*$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must start with uppercase, contain a number and special character",
      });
    }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      user.password =
        hashedPassword;

      await user.save();

      await Otp.deleteMany({
        email,
      });

      await Token.deleteMany({
        userId: user._id,
      });

      res.status(200).json({
        success: true,
        message:
          "Password reset successful",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
  exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      email,
      password,
      countryCode,
      phone,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update Email
    if (email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: userId },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      user.email = email;
    }

    // Update Phone
    if (countryCode && phone) {
      const fullPhone =
        countryCode + phone;

      const phoneExists =
        await User.findOne({
          phone: fullPhone,
          _id: { $ne: userId },
        });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message:
            "Phone already exists",
        });
      }

      user.countryCode =
        countryCode;
      user.phone = fullPhone;
    }

    // Update Password
    if (password) {
      const passwordRegex =
        /^(?=.{8,})(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Z].*$/;

      if (
        !passwordRegex.test(password)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must start with uppercase, contain lowercase, number, special character and be at least 8 characters long",
        });
      }

      user.password =
        await bcrypt.hash(
          password,
          10
        );
    }

    // Update Profile Photo
    if (req.file) {
      user.profilePhoto =
        req.file.path;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};