const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname, {
    extensions: ['html'],
    index: 'index.html'
}));

// Explicit routes for HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/meeting', (req, res) => {
    res.sendFile(path.join(__dirname, 'meeting.html'));
});

app.get('/meeting.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'meeting.html'));
});

// Health check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// 404 handler
app.use((req, res) => {
    console.log(`404: ${req.url}`);
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Server Error');
});

const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0'; // Important for Render

app.listen(PORT, HOST, () => {
    console.log(`✅ SWTMeet server running on ${HOST}:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Serving files from: ${__dirname}`);
});
