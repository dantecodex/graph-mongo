import Order from '../models/Order.js';

const resolvers = {
    Query: {
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

        getTopSellingProducts: async (_, { limit }) => {
            try {
                const productLimit = Math.max(1, limit);

                const topProducts = await Order.aggregate([
                    {
                        $set: {
                            productsArray: {
                                $function: {
                                    body: function (productsStr) {
                                        return JSON.parse(productsStr.replace(/'/g, '"'));
                                    },
                                    args: ["$products"],
                                    lang: "js",
                                },
                            },
                        },
                    },
                    { $unwind: "$productsArray" },
                    {
                        $group: {
                            _id: "$productsArray.productId",
                            totalSold: { $sum: "$productsArray.quantity" },
                        },
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
                                            $eq: [{ $toString: "$_id" }, "$$productId"],
                                        },
                                    },
                                },
                            ],
                            as: "productDetails",
                        },
                    },
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

        getSalesAnalytics: async (_, { startDate, endDate }) => {
            try {
                const matchCondition = {
                    orderDate: { $gte: startDate, $lte: endDate },
                    status: "completed"
                };

                const [revenueData, categoryBreakdown] = await Promise.all([
                    Order.aggregate([
                        { $match: matchCondition },
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: "$totalAmount" },
                                completedOrders: { $sum: 1 }
                            }
                        }
                    ]),
                    Order.aggregate([
                        { $match: matchCondition },
                        {
                            $set: {
                                productsArray: {
                                    $function: {
                                        body: function (productsStr) {
                                            return JSON.parse(productsStr.replace(/'/g, '"'));
                                        },
                                        args: ["$products"],
                                        lang: "js"
                                    }
                                }
                            }
                        },
                        { $unwind: "$productsArray" },
                        {
                            $lookup: {
                                from: "products",
                                let: { prodId: "$productsArray.productId" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [{ $toString: "$_id" }, "$$prodId"]
                                            }
                                        }
                                    }
                                ],
                                as: "productInfo"
                            }
                        },
                        { $unwind: "$productInfo" },
                        {
                            $group: {
                                _id: "$productInfo.category",
                                revenue: {
                                    $sum: {
                                        $multiply: [
                                            "$productsArray.quantity",
                                            "$productsArray.priceAtPurchase"
                                        ]
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                category: "$_id",
                                revenue: { $round: ["$revenue", 2] },
                                _id: 0
                            }
                        },
                        { $sort: { revenue: -1 } }
                    ])
                ])

                return {
                    totalRevenue: revenueData.length ? revenueData[0].totalRevenue : 0,
                    completedOrders: revenueData.length ? revenueData[0].completedOrders : 0,
                    categoryBreakdown
                };
            } catch (error) {
                console.error("Error in getSalesAnalytics:", error);
                throw new Error("Failed to retrieve sales analytics");
            }
        },


        getCustomerOrders: async (_, { customerId, page, limit }) => {
            try {
                if (page < 1 || limit < 1) {
                    throw new Error("Page and limit must be at least 1");
                }

                const totalOrders = await Order.countDocuments({
                    $expr: { $eq: [{ $toString: "$customerId" }, customerId] }
                });

                const totalPages = Math.ceil(totalOrders / limit);

                const orders = await Order.find({
                    $expr: { $eq: [{ $toString: "$customerId" }, customerId] }
                })
                    .sort({ orderDate: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean();


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
                throw new Error("Failed to fetch customer orders");
            }
        },

    }
};

export default resolvers;