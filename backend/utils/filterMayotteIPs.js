// utils/filterMayotteIPs.js
const fs = require('fs').promises;

async function filterMayotteIPs() {
    try {
        // Read the original CSV
        const data = await fs.readFile('./data/ip-rangez.csv', 'utf8');
        const lines = data.split('\n');
        
        // Filter only Mayotte entries
        const mayotteLines = lines.filter(line => {
            if (!line.trim()) return false;
            const fields = line.split(',');
            return fields[2]?.includes('YT'); // Check if country code is YT (Mayotte)
        });

        // Add header if needed
        const outputData = mayotteLines.join('\n');

        // Write to new file
        await fs.writeFile('./data/mayotte-ip-ranges.csv', outputData);
        
        console.log(`Processed ${mayotteLines.length} Mayotte IP ranges`);
        return mayotteLines.length;
    } catch (error) {
        console.error('Error filtering Mayotte IPs:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    filterMayotteIPs().then(count => {
        console.log('Filtering complete!');
    }).catch(console.error);
}

module.exports = filterMayotteIPs;