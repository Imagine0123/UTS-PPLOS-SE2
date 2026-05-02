const express = require('express');
const axios = require('axios');
const app = express();
const mysql = require('mysql2/promise');

app.use(express.json());

const db = mysql.createPool({
    host: 'db-booking', 
    user: 'root',
    password: 'root',
    database: 'booking_db'
});

async function initializeDatabase() {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                user_id INT, 
                room_id INT, 
                total_price DECIMAL(10,2), 
                status VARCHAR(20), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await db.query(createTableQuery);
        console.log("Database initialized: 'bookings' table is ready.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
}
initializeDatabase();

app.post('/bookings', async (req, res) => {
    const { user_id, room_id, duration_months } = req.body;

    try {
        //Talk to Property Service
        const response = await axios.get(`http://property-service:8000/api/rooms/${room_id}`);
        
        let rawData = response.data;

        // If PHP injected warnings, 'rawData' will be a string. We need to extract the JSON.
        if (typeof rawData === 'string') {
            try {
                const jsonStart = rawData.indexOf('{');
                const jsonEnd = rawData.lastIndexOf('}') + 1;
                rawData = JSON.parse(rawData.substring(jsonStart, jsonEnd));
            } catch (e) {
                console.error("Failed to parse messy JSON response:", e);
            }
        }

        // Handle Laravel's potential data wrapping
        const roomData = rawData.data || rawData; 
        const pricePerMonth = roomData.price;

        if (!pricePerMonth) {
            return res.status(400).json({ 
                error: 'Could not find price for this room',
                debug_received: rawData
            });
        }

        const total_price = pricePerMonth * duration_months;

        // 2. SAVE TO THE BOOKING DATABASE
        const [result] = await db.execute(
            'INSERT INTO bookings (user_id, room_id, total_price, status) VALUES (?, ?, ?, ?)',
            [user_id, room_id, total_price, 'success']
        );

        return res.status(201).json({
            message: 'Booking saved to database!',
            booking_id: result.insertId,
            total_price
        });

    } catch (error) {
        console.error("FULL ERROR DETAILS:", error);
        res.status(500).json({ 
            error: 'Booking failed', 
            message: error.message,
            details: error.response ? error.response.data : 'No additional details'
        });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Booking Service running on port ${PORT}`);
});