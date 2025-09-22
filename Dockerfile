# -------------------------
# Next.js Dockerfile
# -------------------------
FROM node:18

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

# Build Next.js app (generates .next)
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Run in production mode
CMD ["npm", "start"]
