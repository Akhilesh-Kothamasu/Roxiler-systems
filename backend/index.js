const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const connectDB = require('./config/db');
connectDB();

app.use(cors());
app.use(express.json());

// Helper function for month conversion
const monthMap = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
};

// Home Route
app.get('/', (req, res) => {
    res.send('Welcome to the Transaction API');
});

// List transactions with search and pagination
// List transactions with search and pagination
app.get('/transactions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const search = req.query.search ? req.query.search.toLowerCase() : '';
        const selectedMonth = monthMap[req.query.month?.toLowerCase()] !== undefined ? monthMap[req.query.month.toLowerCase()] : 2; // Default to March

        const query = {
            dateOfSale: {
                $gte: new Date(2023, selectedMonth, 1),
                $lt: new Date(2023, selectedMonth + 1, 1)
            },
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { price: { $gte: Number(search) || 0 } }  // Apply numeric comparison to price
            ]
        };

        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(perPage);

        const totalCount = await Transaction.countDocuments(query); // Get total count for pagination

        res.json({
            page,
            perPage,
            totalCount,
            transactions
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Statistics for a selected month
app.get('/statistics', async (req, res) => {
    try {
        const selectedMonth = monthMap[req.query.month?.toLowerCase()] || 3;

        const start = new Date(2023, selectedMonth - 1, 1);
        const end = new Date(2023, selectedMonth, 1);

        const totalSales = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: start, $lt: end }, sold: true } },
            { $group: { _id: null, totalAmount: { $sum: '$price' }, totalItems: { $sum: 1 } } }
        ]);

        const unsoldItems = await Transaction.countDocuments({
            dateOfSale: { $gte: start, $lt: end },
            sold: false
        });

        res.json({
            totalSaleAmount: totalSales[0]?.totalAmount || 0,
            totalSoldItems: totalSales[0]?.totalItems || 0,
            totalNotSoldItems: unsoldItems
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Bar chart data
app.get('/bar-chart', async (req, res) => {
    try {
        const selectedMonth = monthMap[req.query.month?.toLowerCase()] || 3;
        const start = new Date(2023, selectedMonth - 1, 1);
        const end = new Date(2023, selectedMonth, 1);

        const priceRanges = [
            { range: '0-100', min: 0, max: 100 },
            { range: '101-200', min: 101, max: 200 },
            { range: '201-300', min: 201, max: 300 },
            { range: '301-400', min: 301, max: 400 },
            { range: '401-500', min: 401, max: 500 },
            { range: '501-600', min: 501, max: 600 },
            { range: '601-700', min: 601, max: 700 },
            { range: '701-800', min: 701, max: 800 },
            { range: '801-900', min: 801, max: 900 },
            { range: '901-above', min: 901, max: Infinity },
        ];

        const barChartData = await Promise.all(
            priceRanges.map(async ({ range, min, max }) => {
                const count = await Transaction.countDocuments({
                    dateOfSale: { $gte: start, $lt: end },
                    price: { $gte: min, $lt: max }
                });
                return { range, count };
            })
        );

        res.json(barChartData);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Pie chart data
app.get('/pie-chart', async (req, res) => {
    try {
        const selectedMonth = monthMap[req.query.month?.toLowerCase()] || 3;
        const start = new Date(2023, selectedMonth - 1, 1);
        const end = new Date(2023, selectedMonth, 1);

        const pieChartData = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: start, $lt: end } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $project: { category: '$_id', itemCount: '$count', _id: 0 } }
        ]);

        res.json(pieChartData);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
