# PiePay Backend Take-Home Assignment (ES6 Version)

This repository contains the solution for the PiePay backend take-home assignment. The project is a Node.js application built with Express.js and MongoDB that provides an API for processing and analyzing Flipkart payment offers. This version is updated to use modern ES6 syntax and best practices.

## Table of Contents
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
- [API Endpoints](#api-endpoints)
- [Assumptions](#assumptions)
- [Design Choices](#design-choices)
- [Scaling the GET /highest-discount Endpoint](#scaling-the-get-highest-discount-endpoint)
- [Future Improvements](#future-improvements)

## Project Structure
```bash
.
├── controllers
│   └── offerController.js
├── models
│   └── Offer.js
├── routes
│   └── offerRoutes.js
├── .env
├── .gitignore
├── index.js
├── package.json
└── README.md
```

- **controllers/offerController.js**: Contains the business logic for handling the API requests.
- **models/Offer.js**: Defines the Mongoose schema for the Offer model.
- **routes/offerRoutes.js**: Defines the API routes and maps them to the controller functions.
- **.env**: Stores environment variables, such as the database connection string.
- **.gitignore**: Specifies which files and directories to ignore in the Git repository.
- **index.js**: The main entry point of the application. It sets up the Express server, connects to the database, and registers the API routes.
- **package.json**: Lists the project dependencies and scripts.
- **README.md**: This file.

## Setup and Installation
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root directory and add the following:
    ```dotenv
    MONGO_URI=mongodb://localhost:27017/piepay
    PORT=3000
    ```

4.  **Start the server:**
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:3000`.

## API Endpoints

### POST /offer
This endpoint receives the complete response of the Flipkart offer API and stores the identified offers in the database.

**Request Body:**
```json
{
  "flipkartOfferApiResponse": {
    "RESPONSE": {
      "offer_sections": [
        {
          "title": "Bank Offer",
          "description": "5% off up to ₹750 on IDFC FIRST Power Women Platinum and Signature Debit Cards. Min Trxn value ₹5,000",
          "tnc": "...",
          "type": "BANK",
          "paymentInstruments": [
            {
              "paymentInstrument": "CREDIT",
              "banks": ["IDFC"]
            }
          ]
        }
      ],
      "adjustment_list" :[]
    }
  }
}
```

**Response Body:**
```json
{
  "noOfOffersIdentified": 1,
  "noOfNewOffersCreated": 1
}
```

### GET /highest-discount
This endpoint calculates the highest discount amount for the given payment details.

**Query Parameters:**
- `amountToPay` (number, required): The final amount to be paid.
- `bankName` (string, required): The name of the bank (e.g., "IDFC").
- `paymentInstrument` (string, optional): The payment instrument (e.g., "CREDIT").

**Example Request:**
```bash
GET /highest-discount?amountToPay=10000&bankName=IDFC&paymentInstrument=CREDIT
```

**Response Body:**
```json
{
  "highestDiscountAmount": 500
}
```

## Assumptions
- The structure of the Flipkart offer API response is consistent.
- The discount calculation logic is based on a percentage-based discount with a maximum cap.
- The `bankName` and `paymentInstrument` values are consistent with the data stored in the database.

## Design Choices
- **Node.js and Express.js**: A popular and lightweight choice for building REST APIs.
- **MongoDB**: A flexible and scalable NoSQL database that is well-suited for storing JSON-like data.
- **Mongoose**: An ODM library for MongoDB that provides a schema-based solution for modeling application data.
- **MVC (Model-View-Controller) Pattern**: The code is organized into models, controllers, and routes to improve modularity and maintainability.
- **ES6 Modules**: Using `import`/`export` for better code organization and to align with modern JavaScript standards.

## Scaling the GET /highest-discount Endpoint
To handle 1,000 requests per second, I would implement the following strategies:
- **Caching**: Use an in-memory cache like Redis to store the results of recent `GET /highest-discount` requests. This would significantly reduce the load on the database.
- **Database Indexing**: Create indexes on the `paymentInstruments.banks` and `paymentInstruments.paymentInstrument` fields in the `Offer` collection to speed up query performance.
- **Load Balancing**: Deploy the application on multiple servers and use a load balancer to distribute the traffic evenly.
- **Connection Pooling**: Mongoose handles connection pooling by default, which is efficient for managing database connections.

