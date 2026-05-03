const express = require("express");
const path = require("path");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND = "http://127.0.0.1:8080";

// Proxy /api/* requests to the C++ backend using native Node.js http
app.all("/api/{*rest}", (req, res) => {
    const url = `${BACKEND}${req.originalUrl}`;
    const options = new URL(url);
    
    const proxyReq = http.request({
        hostname: options.hostname,
        port: options.port,
        path: options.pathname + options.search,
        method: req.method,
        headers: {
            ...req.headers,
            host: options.host,
        },
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
        console.error("Proxy error:", err.message);
        res.status(502).json({ error: "C++ backend is not reachable", detail: err.message });
    });

    // Forward request body for POST requests
    if (req.method === "POST" || req.method === "PUT") {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
});

// Serve the public directory as static files
app.use(express.static(path.join(__dirname, "public")));

// Fallback: serve index.html for any unmatched route
app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Frontend server running on port ${PORT}`);
    console.log(`Proxying /api/* → ${BACKEND}`);
});
