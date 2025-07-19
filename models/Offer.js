// Import the Mongoose library
import mongoose from 'mongoose';

// Define the schema for the Offer model
const offerSchema = new mongoose.Schema({
  adjustmentId: {
    type: String,
    required: true,
    unique: true, // Use adjustment_id as the unique identifier
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String, // e.g., INSTANT_DISCOUNT, CASHBACK_ON_CARD
    required: true,
  },
  paymentInstruments: [
    {
      _id: false, // Don't create an _id for subdocuments
      paymentInstrument: String,
      banks: [String],
    },
  ],
  minTrxnValue: {
    type: Number, // Value in Rupees
    default: 0,
  },
  maxDiscount: {
    type: Number, // Value in Rupees
    default: 0,
  },
  discountPercentage: {
    type: Number,
    default: 0,
  },
});

// Create the Offer model from the schema
const Offer = mongoose.model('Offer', offerSchema);

// Export the Offer model
export default Offer;
