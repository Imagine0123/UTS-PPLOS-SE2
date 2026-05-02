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

app.get('/github', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_CALLBACK_URL}&scope=user:email`;
    res.redirect(githubAuthUrl);
});

app.get('/github/callback', async (req, res) => {
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

        console.log('GitHub Response Data:', tokenResponse.data);

        if (tokenResponse.data.error) {
            throw new Error(`GitHub OAuth Error: ${tokenResponse.data.error_description}`);
        }

        const githubAccessToken = tokenResponse.data.access_token;

        //Get user data
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${githubAccessToken}` }
        });

        //Create user
        const user = {
            id: userResponse.data.id,
            email: userResponse.data.email || `${userResponse.data.login}@github.com`,
            source: 'github'
        };

        const tokens = generateTokens(user);
        refreshTokens.push(tokens.refreshToken);

        //Login
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

app.listen(3001, () => console.log('Auth Service running on port 3001'));