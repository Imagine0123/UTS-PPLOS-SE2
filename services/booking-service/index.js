const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const mysql = require('mysql2/promise');

// Create the connection to the NEW booking database
const db = mysql.createPool({
    host: 'db-booking', 
    user: 'root',
    password: 'root',
    database: 'booking_db'
});

app.post('/api/bookings', async (req, res) => {
    const { user_id, room_id, duration_months } = req.body;

    try {
        // 1. Talk to Property Service (Inter-service call)
        const response = await axios.get(`http://property-service:8000/api/rooms/${room_id}`);
        
        // Handle Laravel's potential data wrapping
        const roomData = response.data.data || response.data; 
        const pricePerMonth = roomData.price;

        if (!pricePerMonth) {
            return res.status(400).json({ error: 'Could not find price for this room' });
        }

        // Calculate the total price using data from the other service
        const total_price = pricePerMonth * duration_months;

        // 2. SAVE TO THE BOOKING DATABASE (Persistence)
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