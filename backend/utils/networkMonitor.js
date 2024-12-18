// utils/networkMonitor.js
const net = require('net');

class NetworkMonitor {
    constructor(regions) {
        this.regions = regions;
        this.status = new Map();
    }

    async checkIP(ip) {
        try {
            console.log(`Checking IP: ${ip}`);
            const result = await this.checkTCP(ip);
            console.log(`${ip}: ${result ? 'TCP successful' : 'no response'}`);
            return result;
        } catch (error) {
            console.error(`Error checking ${ip}:`, error);
            return false;
        }
    }

    checkTCP(ip) {
        // Only check port 80 to reduce timeout risk
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let resolved = false;

            const cleanup = (result) => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                    resolve(result);
                }
            };

            // Shorter timeout for serverless environment
            socket.setTimeout(500);

            socket.on('connect', () => cleanup(true));
            socket.on('error', () => cleanup(false));
            socket.on('timeout', () => cleanup(false));

            try {
                socket.connect(80, ip);
            } catch (e) {
                cleanup(false);
            }
        });
    }

    async checkCityStatus(region) {
        console.log(`\nChecking region: ${region.name}`);
        
        const validRanges = region.ranges.filter(range =>
            range.start !== '0.0.0.0' && range.end !== '255.255.255.255'
        );

        const allChecks = [];
        
        // Take only first 3 ranges per region for quick check
        const rangesToCheck = validRanges.slice(0, 3);
        
        for (const range of rangesToCheck) {
            console.log(`\nPreparing range: ${range.start} to ${range.end}`);
            
            const startParts = range.start.split('.').map(Number);
            
            // Check only 5 IPs per range
            const ipsToCheck = new Set([
                range.start,
                `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + 1}`,
                `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + 2}`,
                `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + 3}`,
                range.end
            ]);

            allChecks.push(...Array.from(ipsToCheck).map(ip => ({ ip, range })));
        }

        // Check IPs in smaller batches
        const BATCH_SIZE = 5;
        let responding = 0;
        const totalChecks = allChecks.length;

        for (let i = 0; i < allChecks.length; i += BATCH_SIZE) {
            const batch = allChecks.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
                batch.map(({ ip }) => this.checkIP(ip))
            );
            responding += results.filter(r => r).length;
        }

        const status = {
            name: region.name,
            coordinates: region.coordinates,
            status: responding > 0 ? 'online' : 'offline',
            connectivity: (responding / totalChecks) * 100,
            lastChecked: new Date().toISOString(),
            ranges: region.ranges,
            totalIPsChecked: totalChecks,
            respondingIPs: responding
        };

        console.log(`\nRegion ${region.name} summary:`);
        console.log(`Total IPs checked: ${totalChecks}`);
        console.log(`Responding IPs: ${responding}`);
        console.log(`Connectivity: ${status.connectivity.toFixed(2)}%`);
        console.log(`Status: ${status.status}`);

        return status;
    }

    async monitorAll() {
        console.log('\nStarting network monitoring...');
        try {
            // Process regions in smaller batches
            const REGION_BATCH_SIZE = 2;
            const updates = [];
            
            for (let i = 0; i < this.regions.length; i += REGION_BATCH_SIZE) {
                const regionBatch = this.regions.slice(i, i + REGION_BATCH_SIZE);
                const batchResults = await Promise.all(
                    regionBatch.map(async region => {
                        try {
                            const status = await this.checkCityStatus(region);
                            this.status.set(region.name, status);
                            return status;
                        } catch (error) {
                            console.error(`Error monitoring ${region.name}:`, error);
                            return null;
                        }
                    })
                );
                updates.push(...batchResults.filter(Boolean));
            }
            
            console.log('\nNetwork monitoring complete.');
            return updates;
        } catch (error) {
            console.error('Error in monitorAll:', error);
            return [];
        }
    }

    getCurrentStatus() {
        return Array.from(this.status.values());
    }
}

module.exports = NetworkMonitor;