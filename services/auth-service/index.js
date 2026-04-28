require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');

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

app.get('/api/auth/github', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_CALLBACK_URL}&scope=user:email`;
    res.redirect(githubAuthUrl);
});

app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: "No code provided by GitHub" });
    }

    try {
        //Get GitHub Access Token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
            },
            { headers: { Accept: 'application/json' } }
        );

        const githubAccessToken = tokenResponse.data.access_token;

        //Get user data
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${githubAccessToken}` }
        });

        // STEP 4: Integrate with your system
        // In a real app, you'd check if userResponse.data.id exists in your DB.
        const user = {
            id: userResponse.data.id,
            email: userResponse.data.email || `${userResponse.data.login}@github.com`,
            source: 'github'
        };

        // Issue YOUR system tokens (The 15m/7d ones)
        const tokens = generateTokens(user);

        // Return the tokens to the frontend
        res.json({
            message: "Login successful via GitHub",
            user: {
                username: userResponse.data.login,
                avatar: userResponse.data.avatar_url
            },
            ...tokens
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Authentication failed during GitHub exchange" });
    }
});

//Register (Tenant/Owner)
/*app.post('/api/auth/register', async (req, res) => {
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
});*/

//Login
/*app.post('/api/auth/login', async (req, res) => {
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
});*/

//Token Refresh
/*app.post('/api/auth/refresh', (req, res) => {
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
});*/

//Logout
/*app.delete('/api/auth/logout', (req, res) => {
    refreshTokens = refreshTokens.filter(t => t !== req.body.token);
    res.status(204).send();
});*/

app.listen(3001, () => console.log('Auth Service running on port 3001'));