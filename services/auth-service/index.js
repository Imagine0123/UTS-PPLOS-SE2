require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const users = []; 
let refreshTokens = []; 

const db = mysql.createPool({
    host: process.env.DB_HOST || 'db-auth',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'authpass',
    database: process.env.DB_NAME || 'auth_db',
    waitForConnections: true,
    connectionLimit: 10
});

const initializeDatabase = async () => {
    try {
        console.log("Checking/Creating tables...");
        
        // Tabel Users
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                role ENUM('tenant', 'owner') DEFAULT 'tenant',
                github_id VARCHAR(255) UNIQUE,
                source ENUM('local', 'github') NOT NULL
            )
        `);

        // Tabel Refresh Tokens
        await db.execute(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token TEXT NOT NULL,
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        console.log("Database tables are ready!");
    } catch (err) {
        console.error("Database initialization failed:", err.message);
    }
};

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
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
        }, { headers: { Accept: 'application/json' } });

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

        let [rows] = await db.execute('SELECT * FROM users WHERE github_id = ? OR email = ?', [githubId, email]);
        user = rows[0];
        
        if (!user) {
            const [result] = await db.execute(
                'INSERT INTO users (email, role, github_id, source) VALUES (?, ?, ?, ?)',
                [email, 'tenant', githubId, 'github']
            );
            user = { id: result.insertId, email, role: 'tenant' };
        }

        const tokens = generateTokens(user);
        refreshTokens.push(tokens.refreshToken);
        await db.execute('INSERT INTO refresh_tokens (token, user_id) VALUES (?, ?)', [tokens.refreshToken, user.id]);

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

//Register (Tenant/Owner)
app.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.execute(
            'INSERT INTO users (email, password, role, source) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, role || 'tenant', 'local']
        );
        
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed. Email might already exist." });
    }
});

//Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ? AND source = "local"', [email]);
        const user = rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const tokens = generateTokens(user);
            await db.execute('INSERT INTO refresh_tokens (token, user_id) VALUES (?, ?)', [tokens.refreshToken, user.id]);
            res.json({ message: "Login successful", ...tokens });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ error: "Login error" });
    }
});

//Token Refresh
app.post('/refresh', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: "Refresh token required" });

    const [rows] = await db.execute('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
    if (rows.length === 0) return res.status(403).json({ message: "Invalid refresh token" });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token expired" });
        const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        res.json({ accessToken });
    });
});

//Logout
app.delete('/logout', async (req, res) => {
    await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [req.body.token]);
    res.status(204).send();
});

const startApp = async () => {
    try {
        console.log("Starting Auth Service...");
        
        await initializeDatabase(); 
        
        app.listen(3001, () => {
            console.log('Auth Service is live on port 3001');
        });
    } catch (err) {
        console.error("Fatal error during startup:", err);
        process.exit(1);
    }
};

startApp();

app.listen(3001, () => console.log('Auth Service running on port 3001'));