const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy API requests to the C++ backend
app.use('/api', createProxyMiddleware({ 
    target: 'http://127.0.0.1:8080', 
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error("Proxy error:", err.message);
        res.status(502).json({ error: "Backend is offline or unreachable." });
    }
}));

// Serve the public directory as static files
app.use(express.static(path.join(__dirname, "public")));

// Fallback: serve index.html for any unmatched route
app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Frontend server running at http://localhost:${PORT}`);
});
