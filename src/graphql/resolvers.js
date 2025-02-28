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
                    // Step 1: Parse the "products" string into an array
                    {
                        $addFields: {
                            parsedProducts: {
                                $function: {
                                    body: function (productsStr) {
                                        const jsonStr = productsStr.replace(/'/g, '"');
                                        return JSON.parse(jsonStr);
                                    },
                                    args: ["$products"],
                                    lang: "js",
                                },
                            },
                        },
                    },
                    // Step 2: Unwind the parsed array
                    { $unwind: "$parsedProducts" },
                    // Step 3: Group by productId (now valid)
                    {
                        $group: {
                            _id: "$parsedProducts.productId",
                            totalSold: { $sum: "$parsedProducts.quantity" },
                        },
                    },
                    // Step 4: Sort and limit
                    { $sort: { totalSold: -1 } },
                    { $limit: productLimit },
                    // Step 5: Lookup product details with type conversion
                    {
                        $lookup: {
                            from: "products",
                            let: { productId: "$_id" }, // productId (string)
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: [
                                                { $toString: "$_id" }, // Convert Product._id to string
                                                "$$productId",
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: "productDetails",
                        },
                    },
                    // Step 6: Unwind and project results
                    { $unwind: "$productDetails" },
                    {
                        $project: {
                            productId: "$_id",
                            name: "$productDetails.name",
                            totalSold: 1,
                            _id: 0,
                        },
                    },
                ]);

                return topProducts;
            } catch (error) {
                console.error("Error in getTopSellingProducts:", error);
                throw new Error("Failed to retrieve top selling products");
            }
        },

        // 3. Get sales analytics for date range
        getSalesAnalytics: async (_, { startDate, endDate }) => {
            try {
                // Get total revenue and completed orders count
                const revenueData = await Order.aggregate([
                    {
                        $match: {
                            orderDate: {
                                $gte: startDate,
                                $lte: endDate
                            },
                            status: "completed"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: "$totalAmount" },
                            completedOrders: { $sum: 1 }
                        }
                    }
                ]);

                console.log('Step 1 - Found completed orders:', revenueData);

                // Get category breakdown with modified pipeline

                const categoryBreakdown = await Order.aggregate([
                    // Match orders in date range with completed status
                    {
                        $match: {
                            orderDate: { $gte: startDate, $lte: endDate },
                            status: "completed",
                        },
                    },
                    // Parse the products string into an array of objects
                    {
                        $addFields: {
                            parsedProducts: {
                                $function: {
                                    body: function (productsStr) {
                                        const jsonStr = productsStr.replace(/'/g, '"');
                                        return JSON.parse(jsonStr);
                                    },
                                    args: ["$products"],
                                    lang: "js",
                                },
                            },
                        },
                    },
                    // Unwind the parsed products array
                    { $unwind: "$parsedProducts" },
                    // Lookup product details with type conversion
                    {
                        $lookup: {
                            from: "products",
                            let: { prodId: "$parsedProducts.productId" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: [
                                                { $toString: "$_id" }, // Convert Product _id to string
                                                "$$prodId", // productId from Order (string)
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: "productInfo",
                        },
                    },
                    // Unwind product info to access individual product details
                    { $unwind: "$productInfo" },
                    // Group by category to sum revenue
                    {
                        $group: {
                            _id: "$productInfo.category",
                            revenue: {
                                $sum: {
                                    $multiply: [
                                        "$parsedProducts.quantity",
                                        "$parsedProducts.priceAtPurchase",
                                    ],
                                },
                            },
                        },
                    },
                    // Format output
                    {
                        $project: {
                            category: "$_id",
                            revenue: { $round: ["$revenue", 2] },
                            _id: 0,
                        },
                    },
                    // Sort by descending revenue
                    { $sort: { revenue: -1 } },
                ]);
                console.log('Step 2 - Category breakdown:', categoryBreakdown);

                // For debugging, let's also get a sample of matched orders
                const sampleOrder = await Order.findOne({
                    orderDate: {
                        $gte: startDate,
                        $lte: endDate
                    },
                    status: "completed"
                });
                console.log('Step 3 - Sample completed order:', sampleOrder);

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

        getCustomerOrders: async (_, { customerId, page, limit }) => {
            try {
                // Validate input
                if (page < 1 || limit < 1) {
                    throw new Error("Page and limit must be at least 1");
                }

                // Count total orders for the customer
                const totalOrders = await Order.countDocuments({
                    $expr: { $eq: [{ $toString: "$customerId" }, customerId] }
                });

                // Calculate total pages
                const totalPages = Math.ceil(totalOrders / limit);

                // Fetch paginated orders
                const orders = await Order.find({
                    $expr: { $eq: [{ $toString: "$customerId" }, customerId] }
                })
                    .sort({ orderDate: -1 }) // Latest orders first
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean();

                // Parse the products field (string → array)
                const parsedOrders = orders.map((order) => {
                    try {
                        const products = JSON.parse(order.products.replace(/'/g, '"'));
                        return { ...order, products };
                    } catch (error) {
                        throw new Error(`Failed to parse products for order ${order._id}`);
                    }
                });

                return {
                    orders: parsedOrders,
                    totalPages,
                    currentPage: page,
                };
            } catch (error) {
                console.error("Error in getCustomerOrders:", error);
                throw new Error("Failed to fetch customer orders");
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