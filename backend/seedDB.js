const mongoose = require('mongoose');
const axios = require('axios');
const Transaction = require('./models/Transaction');
require('dotenv').config();

const connectDB = require('./config/db');
connectDB();

const url = 'https://s3.amazonaws.com/roxiler.com/product_transaction.json';

const seedDatabase = async () => {
    try {
        const response = await axios.get(url);
        const jsonData = response.data;

        // Clear existing data
        await Transaction.deleteMany();

        // Insert data into MongoDB
        await Transaction.insertMany(jsonData);
        console.log('Database initialized with seed data.');
        process.exit();
    } catch (error) {
        console.error('Error fetching data:', error.message);
        process.exit(1);
    }
};

seedDatabase();
