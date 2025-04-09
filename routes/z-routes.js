const express = require('express');
const router = express.Router();
const {
    createThread,
    listThreads,
    getMessages,
    deleteThread,
    renameThread
} = require("../controllers/thread");

const {
    sendMessage
} = require("../controllers/messages");
const { addUser } = require("../controllers/user");

const auth = require("../middleware/auth");


const zroutes = () => {
    // Define the routes for threads
    router.post('/create-thread', auth, createThread); // Create a new thread
    router.get('/list-threads', auth, listThreads); // List all threads
    router.get('/get-messages/:threadID', auth, getMessages); // Get messages for a specific thread
    router.post('/send-message', auth, sendMessage); // Send a message to OpenAI and get a reply
    router.post('/add-user', auth, addUser); // Add user to the system
    router.delete('/delete-thread/:threadID', auth, deleteThread); // Delete a thread
    router.put('/rename-thread/:threadID', auth, renameThread); // Rename a thread

    return router;

}

module.exports = zroutes;