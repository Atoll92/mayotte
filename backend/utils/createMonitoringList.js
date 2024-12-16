// utils/createMonitoringList.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const IPProcessor = require('./ipprocessor');

async function createMonitoringCSV() {
    try {
        const inputPath = path.join(__dirname, '..', 'data', 'ip-rangez.csv');
        const outputPath = path.join(__dirname, '..', 'data', 'monitoring-ranges.csv');
        const processor = new IPProcessor();
        const monitoringRanges = [];

        // Create read stream and readline interface
        const fileStream = fs.createReadStream(inputPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // Process line by line
        for await (const line of rl) {
            if (!line.trim()) continue;
            
            const [start, end, country, , region, city, lat, lon] = line.split(',').map(s => s.replace(/"/g, ''));
            
            if (country === 'YT') {
                monitoringRanges.push({
                    startIP: IPProcessor.numberToIPv4(start),
                    endIP: IPProcessor.numberToIPv4(end),
                    city: city || 'Unknown',
                    longitude: parseFloat(lon) || 0,
                    latitude: parseFloat(lat) || 0
                });
            }
        }

        // Create CSV content
        const header = 'startIP,endIP,city,longitude,latitude';
        const csvLines = monitoringRanges
            .filter(range => range.startIP && range.endIP) // Filter out any invalid conversions
            .map(range => 
                `${range.startIP},${range.endIP},${range.city},${range.longitude},${range.latitude}`
            );
        
        const csvContent = [header, ...csvLines].join('\n');

        // Write to file
        fs.writeFileSync(outputPath, csvContent);
        
        console.log(`Created CSV with ${csvLines.length} IP ranges to monitor`);
        console.log(`File saved as: ${outputPath}`);
        
        // Display sample
        console.log('\nSample of monitoring ranges:');
        console.log(csvLines.slice(0, 3).join('\n'));
        
    } catch (error) {
        console.error('Error creating monitoring CSV:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createMonitoringCSV().catch(console.error);
}

module.exports = createMonitoringCSV;