
const User = require("../models/User");

exports.addUser = async (req, res) => {
  try {
    // At this point, req.user is set by the auth middleware.
    if (!req.user) {
      return res.status(400).json({ success: false, message: "User not found." });
    }
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error("Error in addUser:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
