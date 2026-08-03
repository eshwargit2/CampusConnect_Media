require('dotenv').config();
require('express-async-errors');

//tested
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const storyRoutes = require('./routes/stories');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Apply rate limiter to API routes
app.use('/api', apiLimiter);

// Middleware
app.use(cors({
    origin: true,   // reflect any origin
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    if (err.name === 'MulterError') {
        return res.status(400).json({ error: err.message });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 CampusConnect server running on http://localhost:${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});


