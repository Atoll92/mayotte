// utils/csvReader.js
const fs = require('fs').promises;
const path = require('path');

async function loadIPRanges() {
    try {
        const data = await fs.readFile(path.join(__dirname, '..', 'data', 'monitoring-ranges.csv'), 'utf8');
        const lines = data.split('\n').slice(1); // Skip header
        
        // Group by city
        const cityMap = new Map();
        
        lines.forEach(line => {
            if (!line.trim()) return;
            const [startIP, endIP, city, longitude, latitude] = line.split(',');
            
            if (!cityMap.has(city)) {
                cityMap.set(city, {
                    name: city,
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    ranges: []
                });
            }
            
            cityMap.get(city).ranges.push({
                start: startIP,
                end: endIP
            });
        });
        
        return Array.from(cityMap.values());
    } catch (error) {
        console.error('Error loading IP ranges:', error);
        throw error;
    }
}

module.exports = { loadIPRanges };