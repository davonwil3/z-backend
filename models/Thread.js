const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ThreadSchema = new Schema(
  {
    threadID: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: "New Chat" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Thread", ThreadSchema);