// Import the Express library
import express from 'express';
// Import the offer controller functions
import { createOffers, getHighestDiscount } from '../controllers/offerController.js';

// Create a new router object
const router = express.Router();

// Define the POST /offer route
// This endpoint will receive the Flipkart API response and create offers in the database.
router.post('/offer', createOffers);

// Define the GET /highest-discount route
// This endpoint calculates the best discount based on payment details.
router.get('/highest-discount', getHighestDiscount);

// Export the router as the default export
export default router;
