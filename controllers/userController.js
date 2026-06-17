const User = require("../models/userModel");
const Otp = require("../models/otpModel");
const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");
const token = require("../models/tokenModel");

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
    const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

if (!passwordRegex.test(password)) {
  return res.status(400).json({
    success: false,
    message:
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
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
    if (user.status === "inactive") {
  return res.status(403).json({
    success: false,
    message:
      "Account is deactivated",
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
  { expiresIn: "7d" }
);

await Token.deleteMany({
  userId: user._id,
});

await Token.create({
  userId: user._id,
  token,
});

return res.status(200).json({
  success: true,
  token,
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

const otpData = await Otp.create({
  phone: fullPhone,
  otp,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
});
const checkOtp = await Otp.findOne({
  phone: fullPhone,
});

console.log("Found:", checkOtp);



    console.log(" OTP:", otp);

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
exports.deleteAccount = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(
      userId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete Cloudinary image
    if (user.profilePhoto) {
      try {
        const publicId =
          user.profilePhoto
            .split("/")
            .pop()
            .split(".")[0];

        await cloudinary.uploader.destroy(
          `profile_photos/${publicId}`
        );
      } catch (err) {
        console.log(
          "Cloudinary delete error:",
          err.message
        );
      }
    }

    // Delete all tokens
    await Token.deleteMany({
      userId,
    });

    // Delete OTPs
    await Otp.deleteMany({
      $or: [
        { phone: user.phone },
        { email: user.email },
      ],
    });

    // Delete User
    await User.findByIdAndDelete(
      userId
    );

    return res.status(200).json({
      success: true,
      message:
        "Account deleted successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.blockUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    const user = await User.findById(userId);

    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const alreadyBlocked = user.blockedUsers.some(
      (id) => id.toString() === targetUserId
    );

    if (alreadyBlocked) {
      return res.status(400).json({
        success: false,
        message: "User already blocked",
      });
    }

    // Add to blocked users list
    user.blockedUsers.push(targetUserId);
    await user.save();

    // Make blocked user inactive
    targetUser.status = "inactive";
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User blocked and account deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Unblock User
exports.unblockUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetUserId
    );

    await user.save();

    // Reactivate blocked user
    await User.findByIdAndUpdate(
      targetUserId,
      {
        status: "active",
      }
    );

    return res.status(200).json({
      success: true,
      message: "User unblocked and account activated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Deactivate Account
exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { status: "inactive" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await Token.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.activateAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("Activating User:", userId);

    const user = await User.findByIdAndUpdate(
      userId,
      { status: "active" },
      { new: true }
    );

    console.log("Updated User:", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account activated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// change theme controller
exports.changeTheme = async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme } = req.body;

    if (!["light", "dark", "system"].includes(theme)) {
      return res.status(400).json({
        success: false,
        message: "Invalid theme",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { theme },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Theme updated successfully",
      theme: user.theme,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// get theme 
exports.getTheme = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("theme");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      theme: user.theme,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};