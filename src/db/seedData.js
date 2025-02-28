import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import connectDB from './connection.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CSV file into JSON objects
 * @param {string} filePath - Path to the CSV file
 * @returns {Array} - Array of objects parsed from CSV
 */
const parseCSV = (filePath) => {
    try {
        // Read file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log(`Reading file: ${filePath}`);

        // Split into lines and get headers
        const lines = fileContent.split('\n');
        console.log(`Found ${lines.length} lines`);

        const headers = lines[0].split(',');
        console.log('Headers:', headers);

        // Parse each line
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines

            const currentLine = lines[i].split(',');
            const obj = {};

            for (let j = 0; j < headers.length; j++) {
                let value = currentLine[j]?.trim();

                // Handle special cases
                if (headers[j] === 'products') {
                    try {
                        // Replace single quotes with double quotes for valid JSON
                        value = value.replace(/'/g, '"');
                        obj[headers[j]] = JSON.parse(value);
                    } catch (e) {
                        console.error(`Error parsing products JSON in line ${i}:`, e);
                        obj[headers[j]] = [];
                    }
                } else if (headers[j] === 'age' || headers[j] === 'price' || headers[j] === 'stock' ||
                    headers[j] === 'totalAmount') {
                    obj[headers[j]] = parseFloat(value);
                } else if (headers[j] === 'orderDate') {
                    obj[headers[j]] = new Date(value);
                } else {
                    obj[headers[j]] = value;
                }
            }

            results.push(obj);
        }

        return results;
    } catch (error) {
        console.error(`Error parsing CSV file ${filePath}:`, error);
        return [];
    }
};

/**
 * Seed the database with data from CSV files
 */
const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('Connected to MongoDB for seeding data');

        // Clear existing data
        await Customer.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        console.log('Cleared existing data from the database');

        // Parse CSV files
        const customersData = parseCSV(path.join(__dirname, '../../../customers.csv'));
        const productsData = parseCSV(path.join(__dirname, '../../../products.csv'));
        const ordersData = parseCSV(path.join(__dirname, '../../../orders.csv'));

        console.log(`Parsed ${customersData.length} customers, ${productsData.length} products, and ${ordersData.length} orders`);

        // Insert data into MongoDB
        if (customersData.length) await Customer.insertMany(customersData);
        if (productsData.length) await Product.insertMany(productsData);
        if (ordersData.length) await Order.insertMany(ordersData);

        console.log('Data seeded successfully');

        // Disconnect
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seeding function
seedDatabase();