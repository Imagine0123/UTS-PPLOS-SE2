require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const users = []; 
let refreshTokens = []; 

const generateTokens = (user) => {
    const payload = { id: user.id, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { 
        expiresIn: '15m' //15 menit
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { 
        expiresIn: '7d' //7 hari
    });

    return { accessToken, refreshToken };
};

//Register (Tenant/Owner)
app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = { 
            id: Date.now(), 
            email: req.body.email, 
            password: hashedPassword,
            role: req.body.role || 'tenant'
        };
        users.push(user);
        res.status(201).json({ message: "User registered successfully" });
    } catch {
        res.status(500).send();
    }
});

//Login
app.post('/api/auth/login', async (req, res) => {
    const user = users.find(u => u.email === req.body.email);
    if (!user) return res.status(400).json({ message: "User not found" });

    try {
        if (await bcrypt.compare(req.body.password, user.password)) {
            const tokens = generateTokens(user);
            
            refreshTokens.push(tokens.refreshToken);
            
            res.json({
                message: "Login successful",
                ...tokens
            });
        } else {
            res.status(401).json({ message: "Invalid password" });
        }
    } catch {
        res.status(500).send();
    }
});

//Token Refresh
app.post('/api/auth/refresh', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: "Refresh token required" });
    if (!refreshTokens.includes(token)) return res.status(403).json({ message: "Invalid refresh token" });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token expired or invalid" });
        
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            process.env.JWT_ACCESS_SECRET, 
            { expiresIn: '15m' }
        );
        res.json({ accessToken });
    });
});

//Logout
app.delete('/api/auth/logout', (req, res) => {
    refreshTokens = refreshTokens.filter(t => t !== req.body.token);
    res.status(204).send();
});

app.listen(3001, () => console.log('Auth Service running on port 3001'));