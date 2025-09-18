FROM node:20 AS build_image

# Set the working directory
WORKDIR /app
# Copy only package.json and package-lock.json to install dependencies
COPY package.json ./

RUN npm install


# Copy the rest of the application files
COPY . .

# Build the Node.js app
RUN npm run build

# Stage 2: Production Image
FROM node:20

# Set the working directory
WORKDIR /app

COPY --from=build_image /app/dist ./dist
COPY --from=build_image /app/node_modules ./node_modules
COPY --from=build_image /app/package.json ./package.json

# Expose the port that the Node.js app runs on
EXPOSE 3000

# Start the Node.js app
CMD ["node", "./dist/main.js"]