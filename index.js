const express = require('express');
const app = express();
const port = 10000;
require('dotenv').config();
const setupRoutes = require('./routes/z-routes');
const cors = require('cors');
const mongoose = require('mongoose');

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Use routes with upload middleware
app.use('/api', setupRoutes());

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
