// utils/ipProcessor.js
const fs = require('fs');
const readline = require('readline');

class IPProcessor {
    constructor() {
        this.regions = new Map();
    }

    async loadCSV(filePath) {
        try {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            const mayotteRanges = [];

            for await (const line of rl) {
                if (!line.trim()) continue;
                
                // Parse CSV line, removing quotes
                const [start, end, country, , region, city, lat, lon, zip] = line
                    .split(',')
                    .map(field => field.replace(/"/g, ''));

                // Only process Mayotte entries
                if (country === 'YT') {
                    mayotteRanges.push({
                        start: start,
                        end: end,
                        region,
                        city,
                        location: {
                            lat: parseFloat(lat),
                            lon: parseFloat(lon)
                        },
                        zip
                    });
                }
            }

            // Group by city
            const groupedByCity = mayotteRanges.reduce((acc, range) => {
                if (!acc[range.city]) {
                    acc[range.city] = {
                        name: range.city,
                        coordinates: [range.location.lon, range.location.lat],
                        ranges: [],
                        status: 'unknown'
                    };
                }
                acc[range.city].ranges.push({
                    start: range.start,
                    end: range.end
                });
                return acc;
            }, {});

            return Object.values(groupedByCity);
        } catch (error) {
            console.error('Error processing CSV:', error);
            throw error;
        }
    }

    static numberToIPv4(num) {
        try {
            const n = BigInt(num);
            return [
                Number(n >> 24n & 255n),
                Number(n >> 16n & 255n),
                Number(n >> 8n & 255n),
                Number(n & 255n)
            ].join('.');
        } catch (error) {
            console.error('Error converting number to IPv4:', error);
            return null;
        }
    }

    static getRangesList(regions) {
        const allRanges = [];
        for (const region of regions) {
            for (const range of region.ranges) {
                try {
                    const startIP = this.numberToIPv4(range.start);
                    const endIP = this.numberToIPv4(range.end);
                    if (startIP && endIP) {
                        allRanges.push({
                            city: region.name,
                            startIP,
                            endIP,
                            coordinates: region.coordinates
                        });
                    }
                } catch (error) {
                    console.error('Error processing range:', error);
                    continue;
                }
            }
        }
        return allRanges;
    }
}

module.exports = IPProcessor;