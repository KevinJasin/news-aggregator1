import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000; // You can change the port if needed

app.use(cors()); // Enable CORS for all routes

app.get('/news', async (req, res) => {
    const topic = req.query.topic;
    const NEWS_API_KEY = '233a1a25653c4ba88e576208b7594220'; // Replace with your actual API key
    const url = `https://newsapi.org/v2/everything?q=${topic}&apiKey=${NEWS_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data); // Send the data back to the client
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
