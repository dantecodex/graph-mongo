import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { validateDateFormat } from '../utils/dateUtils.js';

const resolvers = {
    Query: {
        // 1. Get customer spending analytics
        getCustomerSpending: async (_, { customerId }) => {
            try {
                const customerSpendingData = await Order.aggregate([
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    { $toString: "$customerId" },
                                    customerId
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$customerId",
                            totalSpent: { $sum: "$totalAmount" },
                            orderCount: { $sum: 1 },
                            lastOrderDate: { $max: "$orderDate" }
                        }
                    },
                    {
                        $project: {
                            customerId: "$_id",
                            _id: 0,
                            totalSpent: { $round: ["$totalSpent", 2] },
                            averageOrderValue: { $round: [{ $divide: ["$totalSpent", "$orderCount"] }, 2] },
                            lastOrderDate: 1
                        }
                    }
                ]);

                return customerSpendingData.length ? customerSpendingData[0] : null;
            } catch (error) {
                console.error('Error in getCustomerSpending:', error);
                throw new Error('Failed to retrieve customer spending data');
            }
        },

        // 2. Get top selling products
        getTopSellingProducts: async (_, { limit }) => {
            try {
                const productLimit = Math.max(1, limit);

                const topProducts = await Order.aggregate([
                    { $unwind: "$products" },
                    {
                        $group: {
                            _id: "$products.productId",
                            totalSold: { $sum: "$products.quantity" }
                        }
                    },
                    { $sort: { totalSold: -1 } },
                    { $limit: productLimit },
                    {
                        $lookup: {
                            from: "products",
                            let: { productId: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: [
                                                { $toString: "$_id" },
                                                "$$productId"
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    {
                        $project: {
                            productId: "$_id",
                            name: "$productDetails.name",
                            totalSold: 1,
                            _id: 0
                        }
                    }
                ]);

                return topProducts;
            } catch (error) {
                console.error('Error in getTopSellingProducts:', error);
                throw new Error('Failed to retrieve top selling products');
            }
        },

        // 3. Get sales analytics for date range
        getSalesAnalytics: async (_, { startDate, endDate }) => {
            try {
                // Validate date formats
                if (!validateDateFormat(startDate) || !validateDateFormat(endDate)) {
                    throw new Error('Invalid date format. Use ISO format (YYYY-MM-DD)');
                }

                const start = new Date(startDate);
                const end = new Date(endDate);

                // Set end date to end of day
                end.setHours(23, 59, 59, 999);

                // Get total revenue and completed orders count
                const revenueData = await Order.aggregate([
                    {
                        $match: {
                            orderDate: { $gte: start, $lte: end },
                            status: "completed"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: "$totalAmount" },
                            completedOrders: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalRevenue: 1,
                            completedOrders: 1
                        }
                    }
                ]);

                // Get revenue breakdown by category
                const categoryBreakdown = await Order.aggregate([
                    // Match orders in date range with completed status
                    {
                        $match: {
                            orderDate: { $gte: start, $lte: end },
                            status: "completed"
                        }
                    },
                    // Unwind products array
                    { $unwind: "$products" },
                    // Calculate revenue per product item
                    {
                        $project: {
                            productId: "$products.productId",
                            itemRevenue: { $multiply: ["$products.quantity", "$products.priceAtPurchase"] }
                        }
                    },
                    // Lookup product details to get category
                    {
                        $lookup: {
                            from: "products",
                            localField: "productId",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" },
                    // Group by category and sum revenue
                    {
                        $group: {
                            _id: "$productDetails.category",
                            revenue: { $sum: "$itemRevenue" }
                        }
                    },
                    // Format result
                    {
                        $project: {
                            category: "$_id",
                            revenue: 1,
                            _id: 0
                        }
                    },
                    // Sort by revenue in descending order
                    { $sort: { revenue: -1 } }
                ]);

                // Build final result
                return {
                    totalRevenue: revenueData.length ? revenueData[0].totalRevenue : 0,
                    completedOrders: revenueData.length ? revenueData[0].completedOrders : 0,
                    categoryBreakdown: categoryBreakdown
                };
            } catch (error) {
                console.error('Error in getSalesAnalytics:', error);
                throw new Error('Failed to retrieve sales analytics');
            }
        },

        // Additional helper queries for testing
        getCustomer: async (_, { id }) => {
            try {
                const customer = await Customer.findOne({
                    $expr: {
                        $eq: [{ $toString: "$_id" }, id]
                    }
                });
                return customer;
            } catch (error) {
                throw new Error('Failed to retrieve customer');
            }
        },

        getProduct: async (_, { id }) => {
            try {
                const product = await Product.findOne({
                    $expr: {
                        $eq: [{ $toString: "$_id" }, id]
                    }
                });
                return product;
            } catch (error) {
                throw new Error('Failed to retrieve product');
            }
        },

        getOrder: async (_, { id }) => {
            try {
                const order = await Order.findOne({
                    $expr: {
                        $eq: [{ $toString: "$_id" }, id]
                    }
                });
                return order;
            } catch (error) {
                throw new Error('Failed to retrieve order');
            }
        },

        getAllCustomers: async () => {
            try {
                const customers = await Customer.find({});
                console.log('Found customers:', customers.length);
                console.log('Sample customer:', customers[0]);
                return customers;
            } catch (error) {
                console.error('Error fetching customers:', error);
                throw error;
            }
        },

        getAllProducts: async () => {
            return await Product.find({});
        },

        getAllOrders: async () => {
            try {
                const orders = await Order.find({});
                console.log('Total orders in database:', orders.length);
                if (orders.length > 0) {
                    console.log('Sample order:', orders[0]);
                }
                return orders;
            } catch (error) {
                console.error('Error fetching orders:', error);
                throw error;
            }
        }
    }
};

export default resolvers;