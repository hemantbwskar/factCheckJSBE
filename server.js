require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n--- [INCOMING REQUEST] [${timestamp}] ---`);
  console.log(`Method: ${req.method} | Path: ${req.originalUrl}`);
  if (req.params && Object.keys(req.params).length > 0) {
    console.log('Params:', JSON.stringify(req.params, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('Query:', JSON.stringify(req.query, null, 2));
  }
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '***';
    console.log('Body:', JSON.stringify(logBody, null, 2));
  }
  console.log('-------------------------------------------\n');
  next();
});

// Import & Mount Routes
const timelineRoutes = require('./routes/timeline');
const userProfileRoutes = require('./routes/userProfile');
const authRoutes = require('./routes/auth');

app.use('/api/timeline', timelineRoutes);
app.use('/api/userprofile', userProfileRoutes);
app.use('/api', authRoutes);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));