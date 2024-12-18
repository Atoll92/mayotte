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
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

const port = process.env.PORT || 5001;
let monitor = null;

// Explicitly handle CORS preflight requests
app.options('*', (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PATCH, DELETE, PUT"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    res.status(200).end();
});

// Initialize monitoring
async function initializeMonitoring() {
    try {
        const regions = await loadIPRanges();
        monitor = new NetworkMonitor(regions);
        
        // Initial monitoring
        await monitor.monitorAll();
        console.log('Initial monitoring completed');
        
        // Update every 5 minutes
        setInterval(async () => {
            const updates = await monitor.monitorAll();
            console.log(`Updated ${updates.length} regions:`, new Date().toISOString());
        }, 300000);
    } catch (error) {
        console.error('Failed to initialize monitoring:', error);
    }
}

// API endpoint for status
app.get('/api/status', (req, res) => {
    // Add CORS headers for this endpoint
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS, PATCH, DELETE, POST, PUT"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (!monitor) {
        return res.status(503).json({ error: 'Monitoring system initializing' });
    }
    const status = monitor.getCurrentStatus();
    res.json(status);
});

// 


// Initialize and start server
initializeMonitoring().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log('Access status at: http://localhost:${port}/api/status');
    });
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

app.get('/api/network-coverage', async (req, res) => {
    console.log('Network coverage request received');
    try {
        const { ranges, networkAreas } = await loadFirewallRanges();
        console.log('Sending response with:', {
            totalRanges: ranges.length,
            totalAreas: networkAreas.length
        });
        res.json({
            timestamp: new Date().toISOString(),
            totalRanges: ranges.length,
            networkAreas: networkAreas
        });
    } catch (error) {
        console.error('Error serving network coverage:', error);
        res.status(500).json({ error: 'Failed to load network coverage data' });
    }
});