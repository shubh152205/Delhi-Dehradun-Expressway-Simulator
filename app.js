const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve the public directory as static files
app.use(express.static(path.join(__dirname, "public")));

// Fallback: serve index.html for any unmatched route
app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Frontend server running at http://localhost:${PORT}`);
});
