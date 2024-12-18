// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { loadIPRanges } = require('./utils/csvReader');
const NetworkMonitor = require('./utils/networkMonitor');
const { loadAntennas } = require('./utils/antennaProcessor');
const { loadFirewallRanges } = require('./utils/ipRangeProcessor');

const app = express();

// Configure CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version'],
    credentials: true
}));

app.use(express.json());

let monitor = null;

// Initialize monitoring
async function initializeMonitoring() {
    try {
        if (!monitor) {
            const regions = await loadIPRanges();
            monitor = new NetworkMonitor(regions);
            await monitor.monitorAll();
            console.log('Initial monitoring completed');
        }
        return monitor;
    } catch (error) {
        console.error('Failed to initialize monitoring:', error);
        throw error;
    }
}

// API endpoint for status
app.get('/api/status', async (req, res) => {
    try {
        const monitor = await initializeMonitoring();
        const status = monitor.getCurrentStatus();
        res.json(status);
    } catch (error) {
        console.error('Error in status endpoint:', error);
        res.status(503).json({ error: 'Monitoring system error' });
    }
});

app.get('/api/antennas', async (req, res) => {
    try {
        const antennas = await loadAntennas();
        res.json(antennas);
    } catch (error) {
        console.error('Error fetching antennas:', error);
        res.status(500).json({ error: 'Failed to fetch antenna data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Handle both Vercel and local development
if (process.env.VERCEL) {
    console.log('Running in Vercel environment');
    module.exports = app;
} else {
    const port = process.env.PORT || 5001;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Access status at: http://localhost:${port}/api/status`);
        // Start periodic updates only in local environment
        setInterval(async () => {
            if (monitor) {
                const updates = await monitor.monitorAll();
                console.log(`Updated ${updates.length} regions:`, new Date().toISOString());
            }
        }, 300000);
    });
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});