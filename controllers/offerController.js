import Offer from '../models/Offer.js';
import logger from '../logger.js';

/**
 * Parses the offer summary to extract percentage and max discount if available.
 * This is a helper function to supplement the more direct data from offer_txn_limits.
 * @param {string} summary - The offer summary text.
 * @returns {{discountPercentage: number}}
 */
const parseSummaryForPercentage = (summary) => {
    let discountPercentage = 0;
    // Regex to find patterns like "5% off"
    const percentageMatch = summary.match(/(\d+)% off/);
    if (percentageMatch) {
        discountPercentage = parseInt(percentageMatch[1], 10);
    }
    return { discountPercentage };
};


/**
 * Controller to create/update offers from the detailed Flipkart API response.
 * It correlates data from `adjustment_list` and `offer_sections` using `adjustment_id`.
 */
export const createOffers = async (req, res) => {
    try {
        const { flipkartOfferApiResponse } = req.body;
        if (!flipkartOfferApiResponse) {
            logger.warn('Missing flipkartOfferApiResponse in request body');
            return res.status(400).json({ message: 'Missing flipkartOfferApiResponse in request body' });
        }

        // Handle nested response structure
        const apiData = flipkartOfferApiResponse.RESPONSE || flipkartOfferApiResponse;

        // 1. Create a map of contributors from `offer_sections` for efficient lookup.
        // This map will store bank and payment instrument info against each offer's adjustment_id.
        const contributorsMap = new Map();
        const offerSections = apiData.offer_sections || {};
        for (const sectionKey in offerSections) {
            const section = offerSections[sectionKey];
            if (section && Array.isArray(section.offers)) {
                for (const offer of section.offers) {
                    if (offer.adjustment_id && offer.contributors) {
                        contributorsMap.set(offer.adjustment_id, offer.contributors);
                    }
                }
            }
        }

        // 2. Process the main `adjustment_list` which contains the core offer data.
        // The path to adjustment_list can be nested, so we use optional chaining and check multiple possible paths.
        const adjustmentList = apiData.adjustment_list || apiData.options?.[0]?.adjustments?.adjustment_list || [];

        // 3. Filter for applicable offers and create a structured offer object.
        const offersToProcess = adjustmentList
            // fileter out offers details is not present or if the adjustment_sub_type is EMI_FULL_INTEREST_WAIVER
            .filter(adj =>  adj.offer_details && adj.offer_details.adjustment_sub_type !== 'EMI_FULL_INTEREST_WAIVER')
            .map(adj => {
                const details = adj.offer_details;
                const contributors = contributorsMap.get(details.adjustment_id);

                // If we can't find the corresponding bank/payment instrument info, we can't use the offer.
                if (!contributors) {
                    return null;
                }

                const { discountPercentage } = parseSummaryForPercentage(details.summary);
                
                // Note: Values like min_txn_value are in the smallest currency unit (e.g., paise). We convert them to Rupees.
                const minTrxnValue = (details.offer_txn_limits?.min_txn_value || 0) / 100;
                const maxDiscount = (details.offer_txn_limits?.max_discount_per_txn || 0) / 100;

                // Create a clean representation of payment instruments and associated banks.
                const paymentInstruments = contributors.payment_instrument.map(instrument => ({
                    paymentInstrument: instrument,
                    banks: contributors.banks || []
                }));

                return {
                    adjustmentId: details.adjustment_id,
                    title: details.title,
                    description: details.summary,
                    type: details.adjustment_type,
                    paymentInstruments,
                    minTrxnValue,
                    maxDiscount,
                    discountPercentage,
                };
            })
            .filter(offer => offer !== null); // Filter out any null entries from the map.

        const noOfOffersIdentified = offersToProcess.length;
        if (noOfOffersIdentified === 0) {
            logger.info('No applicable offers identified from the API response.');
            return res.status(200).json({
                noOfOffersIdentified: 0,
                noOfNewOffersCreated: 0,
            });
        }

        // 4. Efficiently check for existing offers and insert only new ones.
        const adjustmentIds = offersToProcess.map(o => o.adjustmentId);
        const existingOffers = await Offer.find({ adjustmentId: { $in: adjustmentIds } });
        const existingIds = new Set(existingOffers.map(o => o.adjustmentId));

        const newOffersToCreate = offersToProcess.filter(o => !existingIds.has(o.adjustmentId));

        if (newOffersToCreate.length > 0) {
            await Offer.insertMany(newOffersToCreate);
            logger.info(`Created ${newOffersToCreate.length} new offers.`);
        }

        res.status(201).json({
            noOfOffersIdentified,
            noOfNewOffersCreated: newOffersToCreate.length,
        });

    } catch (error) {
        logger.error('Error creating offers:', error);
        res.status(500).json({ message: 'Error creating offers', error: error.message });
    }
};


/**
 * Controller to find the highest applicable discount for a given transaction.
 */
export const getHighestDiscount = async (req, res) => {
    try {
        const { amountToPay, bankName, paymentInstrument } = req.query;
        const numericAmountToPay = Number(amountToPay);

        if (isNaN(numericAmountToPay) || !bankName) {
            logger.warn('Invalid query parameters for getHighestDiscount', { query: req.query });
            return res.status(400).json({ message: 'Invalid query parameters. `amountToPay` and `bankName` are required.' });
        }

        // Build the query to find all potentially applicable offers from the database.
        const query = {
            'paymentInstruments.banks': bankName,
            'minTrxnValue': { $lte: numericAmountToPay }
        };

        // If a payment instrument is specified, add it to the query.
        if (paymentInstrument) {
            query['paymentInstruments.paymentInstrument'] = paymentInstrument;
        }
        logger.info('Query for applicable offers:', query);

        const applicableOffers = await Offer.find(query);

        logger.info('Applicable offers found:', applicableOffers);

        // Calculate the discount for each applicable offer and find the maximum.
        const highestDiscountAmount = applicableOffers.reduce((maxCalculatedDiscount, offer) => {
            let currentDiscount = 0;
            // Handle percentage-based discounts
            if (offer.discountPercentage > 0) {
                currentDiscount = (numericAmountToPay * offer.discountPercentage) / 100;
                // Apply the cap if the calculated discount exceeds it.
                if (offer.maxDiscount > 0 && currentDiscount > offer.maxDiscount) {
                    currentDiscount = offer.maxDiscount;
                }
            } 
            // Handle flat discounts (where no percentage is specified)
            else if (offer.maxDiscount > 0) {
                currentDiscount = offer.maxDiscount;
            }

            return Math.max(maxCalculatedDiscount, currentDiscount);
        }, 0);

        res.status(200).json({ highestDiscountAmount });

    } catch (error) {
        logger.error('Error calculating highest discount:', error);
        res.status(500).json({ message: 'Error calculating highest discount', error: error.message });
    }
};
