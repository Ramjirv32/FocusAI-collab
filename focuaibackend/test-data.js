const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const AppUsage = require('./models/AppUsage');
const Tabusage = require('./models/TabUsage');

const app = express();

// Add middleware
app.use(cors());
app.use(express.json());

// Use environment variable for MongoDB connection or fallback to hardcoded
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
  process.exit(1);
});

app.get("/g", async (req, res) => {
  try {
    // Check if the models have the correct method names
    const appUsage = await AppUsage.find({ userId: '68729fb1764f2d09ce1da006' });
    const tabUsage = await Tabusage.find({ email: 'h@gmail.com' });
    
    res.json({ 
      appUsage: appUsage || [], 
      tabUsage: tabUsage || [] 
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Use environment variable for port or fallback
const PORT = process.env.PORT || 1600;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
