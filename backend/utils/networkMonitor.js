// utils/networkMonitor.js
const ping = require('ping');
const { promisify } = require('util');
const dns = require('dns');
const resolveDns = promisify(dns.resolve);

class NetworkMonitor {
    constructor(regions) {
        this.regions = regions;
        this.status = new Map();
    }

    // Check a single IP
    async checkIP(ip) {
        try {
            const result = await ping.promise.probe(ip, {
                timeout: 2,
                min_reply: 1
            });
            return result.alive;
        } catch (error) {
            return false;
        }
    }

    // Check a range of IPs for a city
    async checkCityStatus(region) {
        let totalChecked = 0;
        let responding = 0;

        // Test sample IPs from each range
        for (const range of region.ranges.slice(0, 5)) { // Check first 5 ranges
            try {
                const startIP = range.start;
                const isAlive = await this.checkIP(startIP);
                if (isAlive) responding++;
                totalChecked++;
            } catch (error) {
                console.error(`Error checking IP in ${region.name}:`, error);
            }
        }

        return {
            name: region.name,
            coordinates: region.coordinates,
            status: responding > 0 ? 'online' : 'offline',
            connectivity: totalChecked > 0 ? (responding / totalChecked) * 100 : 0,
            lastChecked: new Date().toISOString(),
            ranges: region.ranges
        };
    }

    // Monitor all cities
    async monitorAll() {
        const updates = [];
        for (const region of this.regions) {
            try {
                const status = await this.checkCityStatus(region);
                this.status.set(region.name, status);
                updates.push(status);
            } catch (error) {
                console.error(`Error monitoring ${region.name}:`, error);
            }
        }
        return updates;
    }

    // Get current status
    getCurrentStatus() {
        return Array.from(this.status.values());
    }
}

module.exports = NetworkMonitor;