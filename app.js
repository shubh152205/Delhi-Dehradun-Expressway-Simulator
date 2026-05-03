const express = require("express");
const path = require("path");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_PORT = 8080;

// Health check — tells us if this code version is actually deployed
app.get("/health", (req, res) => {
    res.json({ status: "ok", version: "v6-native-proxy", port: PORT, backend: BACKEND_PORT });
});

// Proxy ALL /api requests to the C++ backend using middleware (not route matching)
app.use((req, res, next) => {
    if (!req.url.startsWith("/api")) return next();

    const options = {
        hostname: "127.0.0.1",
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` },
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
        console.error("Proxy error:", err.message);
        res.status(502).json({ error: "C++ backend unreachable", detail: err.message });
    });

    if (req.method === "POST" || req.method === "PUT") {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
});

// Serve the public directory as static files
app.use(express.static(path.join(__dirname, "public")));

// Fallback: serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend running on port ${PORT}`);
    console.log(`Proxying /api/* → http://127.0.0.1:${BACKEND_PORT}`);
});
