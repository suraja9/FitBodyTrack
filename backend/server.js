const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/workouts', require('./routes/workoutRoutes'));
app.use('/api/nutrition', require('./routes/nutritionRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'FitBodyTrack API is running!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});