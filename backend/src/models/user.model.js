import mongoose from "mongoose";
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },

  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },

  role: {
    type: String,
    enum: ["customer", "admin", ],
    // default: "customer",
    index: true,
  },

  // branch: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Branch",
  //   required: function () {
  //     return this.role === "staff";
  //   }
  // }
}, { timestamps: true });

/* =======================
   PASSWORD HASHING
======================= */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // next();
  } catch (err) {
    // next(err);
    throw(err)
  }
});

/* =======================
   PASSWORD COMPARISON
======================= */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;