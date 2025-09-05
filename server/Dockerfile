FROM node:20-alpine

EXPOSE 3000

WORKDIR /app

COPY package*.json ./

# Install all dependencies (includes devDependencies) and cache layer
RUN npm install

COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Run the compiled server
CMD ["node", "dist/server.js"]
