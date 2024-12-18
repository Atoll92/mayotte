// utils/csvReader.js
const fs = require('fs').promises;
const path = require('path');

async function loadIPRanges() {
    try {
        // Update the file name to monitoring-ranges-v2.csv
        const data = await fs.readFile(path.join(__dirname, '..', 'data', 'monitoring-ranges-v2.csv'), 'utf8');
        const lines = data.split('\n').slice(1); // Skip header
        
        // Group by city
        const cityMap = new Map();
        
        lines.forEach(line => {
            if (!line.trim()) return;
            // Add the new numeric IP columns to the destructuring
            const [startIP, endIP, city, longitude, latitude, startIPNum, endIPNum] = line.split(',');
            
            if (!cityMap.has(city)) {
                cityMap.set(city, {
                    name: city,
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    ranges: []
                });
            }
            
            cityMap.get(city).ranges.push({
                start: startIP,
                end: endIP,
                // Add the numeric representations
                startNum: parseInt(startIPNum),
                endNum: parseInt(endIPNum)
            });
        });
        
        return Array.from(cityMap.values());
    } catch (error) {
        console.error('Error loading IP ranges:', error);
        throw error;
    }
}

module.exports = { loadIPRanges };