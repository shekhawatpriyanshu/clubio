const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploads");

const {
  register,
  getUserTokens,
  sendOtp,
  verifyOtp,
  login,
} = require("../controllers/userController");

console.log("REGISTER ROUTE HIT");

router.post(
  "/register",
  upload.single("profilePhoto"),
  (req, res, next) => {
    console.log("👉 MULTER PASSED");
    next();
  },
  register
);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.get(
  "/tokens/:userId",
  getUserTokens
);

module.exports = router;