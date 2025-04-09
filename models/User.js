const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
    {
        firebaseUID: { type: String, required: true, unique: true },
        email: { type: String, required: true },
        name: String,
        avatar: String,
        role: { type: String, enum: ["user", "admin"], default: "user" }
      },
      { timestamps: true }
    );

module.exports = mongoose.model("User", UserSchema);
