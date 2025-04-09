const admin = require("../helpers/firebaseAdmin");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: Missing token");
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUID = decoded.uid;

    // Try to find or create user in MongoDB
    let user = await User.findOne({ firebaseUID });

    if (!user) {
      user = await User.create({
        firebaseUID,
        email: decoded.email,
        name: decoded.name || "",
        avatar: decoded.picture || ""
      });
    }

    req.user = user; // attach user to the request
    next();
  } catch (err) {
    console.error("Token verification failed", err);
    return res.status(401).send("Unauthorized: Invalid token");
  }
}

module.exports = authMiddleware;
