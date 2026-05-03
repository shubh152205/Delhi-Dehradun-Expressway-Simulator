# Stage 1: Build the C++ backend
FROM node:20-slim AS builder
WORKDIR /app/backend
RUN apt-get update && apt-get install -y g++ make curl
COPY backend/server.cpp backend/Makefile ./
RUN curl -L -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h && \
    curl -L -o json.hpp https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp && \
    make

# Stage 2: Runtime
FROM node:20-slim
WORKDIR /app

# Copy backend binary
COPY --from=builder /app/backend/server ./backend/server

# Copy frontend and data
COPY public/ ./public/
COPY expressway.txt ./
COPY app.js package.json package-lock.json ./

# Install Node dependencies
RUN npm ci --omit=dev

# Expose the frontend port
EXPOSE 3000

# Start script: runs C++ backend in background, then starts Node frontend
CMD ["sh", "-c", "cd backend && ./server & sleep 1 && cd /app && node app.js"]
