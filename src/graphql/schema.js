import { gql } from 'apollo-server-express';

const typeDefs = gql`
  # Types
  type Customer {
    _id: ID!
    name: String!
    email: String!
    age: Int!
    location: String!
    gender: String!
  }
  
  type Product {
    _id: ID!
    name: String!
    category: String!
    price: Float!
    stock: Int!
  }
  
  type ProductItem {
    productId: ID!
    quantity: Int!
    priceAtPurchase: Float!
  }
  
  type Order {
    _id: ID!
    customerId: ID!
    products: [ProductItem!]!
    totalAmount: Float!
    orderDate: String!
    status: String!
  }
  
  # Query response types
  type CustomerSpending {
    customerId: ID!
    totalSpent: Float!
    averageOrderValue: Float!
    lastOrderDate: String
  }
  
  type TopProduct {
    productId: ID!
    name: String!
    totalSold: Int!
  }
  
  type CategoryBreakdown {
    category: String!
    revenue: Float!
  }
  
  type SalesAnalytics {
    totalRevenue: Float!
    completedOrders: Int!
    categoryBreakdown: [CategoryBreakdown!]!
  }

  type CustomerOrdersResponse {
  orders: [Order!]!
  totalPages: Int!
  currentPage: Int!
}
  
  # Queries
  type Query {
    getCustomerSpending(customerId: ID!): CustomerSpending
    getTopSellingProducts(limit: Int!): [TopProduct]
    getSalesAnalytics(startDate: String!, endDate: String!): SalesAnalytics
    getCustomerOrders(customerId: ID!, page: Int!, limit: Int!): CustomerOrdersResponse
  }
`;

export default typeDefs;