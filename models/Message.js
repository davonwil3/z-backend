const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
  {
    threadID: { type: String, required: true, index: true },
    text: { type: String, required: true },
    sender: { type: String, enum: ["user", "assistant"], required: true },
    followUpQuestions: [{ question: String }],
    citations: [String],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
