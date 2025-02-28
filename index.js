import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import dotenv from 'dotenv';
import connectDB from './src/db/connection.js';
import typeDefs from './src/graphql/schema.js';
import resolvers from './src/graphql/resolvers.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

// Initialize Express
const app = express();

async function startServer() {
    // Connect to MongoDB
    await connectDB();

    // Initialize Apollo Server
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        formatError: (error) => {
            console.error('GraphQL Error:', error);
            return {
                message: error.message,
                path: error.path
            };
        }
    });

    await server.start();

    // Apply Apollo middleware to Express
    server.applyMiddleware({ app });

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`);
    });
}

startServer().catch(error => {
    console.error('Failed to start server:', error);
});