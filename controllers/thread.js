const { get } = require('mongoose');
const OpenAI = require('openai');
const openai = new OpenAI(process.env.OPENAI_API_KEY)
const User = require('../models/User').User;
const Thread = require('../models/Thread');
const Message = require('../models/Message');

exports.createThread = async (req, res) => {
  try {
    const userID = req.user?._id || req.body.user;
    if (!userID) return res.status(400).send("User ID required");

    const { title } = req.body;
    const openaiThread = await openai.beta.threads.create();

    const newThread = await Thread.create({
      threadID: openaiThread.id,
      title,
      user: userID,
    });

    res.json({ threadID: newThread.threadID });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create thread");
  }
};

exports.listThreads = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Listing threads for user:", userId);
   
    const threads = await Thread.find({ user: userId })
      .sort({ createdAt: -1 })
      .select("threadID title createdAt");
    res.json({ threads });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch threads");
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { threadID } = req.params;
    const userId = req.user._id;
    const messages = await Message.find({ threadID, user: userId }).sort({ createdAt: 1 });
    res.json(
      messages.map((m) => ({
        text: m.text,
        sender: m.sender,
        followUpQuestions: m.followUpQuestions,
        citations: m.citations,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch messages");
  }
};

// This function is used to delete a thread and all its messages , also the thread in openai

exports.deleteThread = async (req, res) => {
  try {
    const { threadID } = req.params;
    const userId = req.user._id;

    // Find the thread
    const thread = await Thread.findOne({ threadID, user: userId });
    if (!thread) return res.status(404).send("Thread not found");

    // Delete messages associated with the thread
    await Message.deleteMany({ threadID });

    // Delete the thread from MongoDB
    await thread.deleteOne(); // Use deleteOne instead of remove

    res.send("Thread deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to delete thread");
  }
};

// function to rename a thread 
exports.renameThread = async (req, res) => {
  try {
    const { threadID } = req.params;
    const { title } = req.body; // New title for the thread
    const userId = req.user._id;

    if (!title || title.trim() === "") {
      return res.status(400).send("Title cannot be empty");
    }

    // Find the thread
    const thread = await Thread.findOne({ threadID, user: userId });
    if (!thread) return res.status(404).send("Thread not found");

    // Update the title in MongoDB
    thread.title = title;
    await thread.save();

    res.json({ message: "Thread renamed successfully", thread });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to rename thread");
  }
};


