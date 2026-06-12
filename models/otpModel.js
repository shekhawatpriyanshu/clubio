const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: String,
    otp: String,
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Otp",
  otpSchema
);