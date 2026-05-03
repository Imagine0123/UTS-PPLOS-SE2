require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();

app.use((req, res, next) => {
    console.log(`[GATEWAY DEBUG] Incoming Request: ${req.method} ${req.url}`);
    next();
});

// rateLimit: 60 req/min
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

//JWT Verification
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided.' });

    const bearerToken = token.split(' ')[1] || token;

    jwt.verify(bearerToken, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized! Token expired or invalid.' });
        req.user = decoded;
        next();
    });
};

// Auth Service
app.use('/api/auth', createProxyMiddleware({ 
    target: 'http://auth-service:3001', 
    changeOrigin: true 
}));

//Property
app.use('/api/properties', verifyToken, createProxyMiddleware({ 
    target: 'http://property-service:8000', 
    changeOrigin: true,
    pathRewrite: { '^/api/properties': '/api/rooms' }
}));

// Booking
app.use('/api/bookings', verifyToken, (req, res, next) => {
    createProxyMiddleware({ 
        target: 'http://booking-service:3002',
        changeOrigin: true,
        pathRewrite: (path, req) => {
            console.log(`[REWRITE] Original: ${path} -> Target: /bookings`);
            return '/bookings'; 
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log(`[GATEWAY] Forwarding: ${req.method} ${req.originalUrl} -> http://booking-service:3002${proxyReq.path}`);
        },
        onError: (err, req, res) => {
            console.error("Proxy Error:", err);
            res.status(500).json({ error: "Booking Service is down or unreachable" });
        }
    })(req, res, next);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});