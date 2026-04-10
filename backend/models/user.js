const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "teacher"], // Restricts values to these two options
      default: "student",
    },
    credits: {
      type: Number,
      default: 100, // starting credits when user registers
    },
    failedloginattemps: {
      type: Number,
      default: 0,
    },
    lastLoginfail: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetPIN: String,
    passwordResetPINExpires: Date,
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});
const User = mongoose.model("User", userSchema);

module.exports = User;
