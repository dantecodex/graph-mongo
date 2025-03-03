# Setup Instructions

1. Clone the repository:
   ```sh
   git clone <repository_url>
   cd <repository_name>
   ```
2. Install dependencies:
   ```sh
   npm install  # or use yarn
   ```
3. Set up environment variables in a `.env` file:
   ```sh
   MONGO_URI=mongodb://localhost:27017/your_database
   PORT=4000
   ```
   **Note:** Use MongoDB on localhost and not Atlas, as certain functions require a top-tier Atlas plan.
4. Start the server:
   ```sh
   npm run dev  # or use yarn dev
   ```
5. Access GraphQL Playground at:
   ```
   http://localhost:4000/graphql
   ```
