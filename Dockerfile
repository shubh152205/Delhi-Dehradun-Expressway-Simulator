# Stage 1: Build the C++ backend
FROM node:20-slim AS builder
WORKDIR /app/backend
RUN apt-get update && apt-get install -y g++ make curl && rm -rf /var/lib/apt/lists/*
COPY backend/server.cpp backend/Makefile ./
RUN curl -L -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h && \
    curl -L -o json.hpp https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp && \
    make && \
    echo "=== C++ backend compiled successfully ===" && \
    ls -la server

# Stage 2: Runtime
FROM node:20-slim
WORKDIR /app

# Install libstdc++ (required by the C++ binary)
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*

# Copy backend binary and make it executable
COPY --from=builder /app/backend/server ./backend/server
RUN chmod +x ./backend/server

# Copy frontend, data, and startup script
COPY public/ ./public/
COPY expressway.txt ./backend/expressway.txt
COPY expressway.txt ./expressway.txt
COPY app.js package.json package-lock.json ./
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Install Node dependencies
RUN npm ci --omit=dev

# Render uses the PORT env variable
ENV PORT=3000
EXPOSE 3000

CMD ["./start.sh"]
