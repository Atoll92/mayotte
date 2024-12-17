// utils/antennaProcessor.js
const fs = require('fs').promises;
const path = require('path');

function safeDate(timestamp) {
    try {
        if (!timestamp || isNaN(timestamp)) return null;
        const date = new Date(parseInt(timestamp) * 1000);
        return date.getTime() > 0 ? date.toISOString() : null;
    } catch (error) {
        return null;
    }
}

async function loadAntennas() {
    try {
        const data = await fs.readFile(path.join(__dirname, '..', 'data', 'mayotte-antennes.csv'), 'utf8');
        const lines = data.split('\n').slice(1); // Skip header
        
        return lines
            .filter(line => line.trim())
            .map(line => {
                try {
                    const [radio, mcc, net, area, cell, unit, lon, lat, range, samples, changeable, created, updated] = line.split(',');
                    
                    if (!lon || !lat || isNaN(parseFloat(lon)) || isNaN(parseFloat(lat))) {
                        return null;
                    }

                    return {
                        id: `${area}-${cell}`,
                        type: radio,
                        operator: net === '10' ? 'Orange' : 'SFR',
                        lon: parseFloat(lon),
                        lat: parseFloat(lat),
                        range: parseInt(range) || 0,
                        lastUpdate: safeDate(updated)
                    };
                } catch (error) {
                    console.error('Error processing antenna line:', error);
                    return null;
                }
            })
            .filter(antenna => 
                antenna !== null && 
                !isNaN(antenna.lon) && 
                !isNaN(antenna.lat) && 
                antenna.lon !== 0 && 
                antenna.lat !== 0
            );
    } catch (error) {
        console.error('Error loading antennas:', error);
        return [];
    }
}

module.exports = { loadAntennas };