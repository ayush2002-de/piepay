// Import necessary packages
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import offerRoutes from './routes/offerRoutes.js';
import logger from './logger.js';

// Load environment variables from .env file
dotenv.config({ quiet: true });

// Initialize express app
const app = express();



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  logger.info('Connected to MongoDB');
}).catch((error) => {
  logger.error('Error connecting to MongoDB:', error);
});

// Set port
const port = process.env.PORT || 3000;

// Default route
app.get('/', (req, res) => {
  res.send('System is up!');
});

// Use a larger payload limit for the /api path, then mount the routes
app.use('/api', express.json({ limit: '50mb' }));
app.use('/api', offerRoutes);

// Start the server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
