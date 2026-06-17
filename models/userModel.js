const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      default: "+91",
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },
     email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
       match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in)$/,
        "Only .com and .in email domains are allowed",
      ],
    
    },
    profilePhoto: {
      type: String,
      default: "",
    },

   password: {
  type: String,
  required: true,
  
},
blockedUsers: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],

status: {
  type: String,
  enum: ["active", "inactive"],
  default: "active",
},
theme:{
  type:String,
  enum:['dark','light','system'],
  default:'light'

},


    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "User",
  userSchema
);