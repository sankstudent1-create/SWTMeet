const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/meeting.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'meeting.html'));
});

// Catch all route - serve index.html for any other route
app.get('*', (req, res) => {
    // Check if file exists
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`✅ SWTMeet server running on port ${PORT}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
});
