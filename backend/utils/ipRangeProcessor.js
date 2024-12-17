// utils/ipRangeProcessor.js
const fs = require('fs').promises;
const path = require('path');
const ping = require('ping');

async function checkIPStatus(ip) {
    try {
        const result = await ping.promise.probe(ip, {
            timeout: 2,
            min_reply: 1
        });
        return result.alive;
    } catch (error) {
        console.error(`Error pinging ${ip}:`, error);
        return false;
    }
}

async function loadFirewallRanges() {
    try {
        console.log('Reading firewall file...');
        const filePath = path.join(__dirname, '..', 'data', 'mayotte-firewall.txt');
        const data = await fs.readFile(filePath, 'utf8');
        const lines = data.split('\n');

        // Process IP ranges and check their status
        const ranges = await Promise.all(
            lines
                .filter(line => line.trim().startsWith('allow from'))
                .map(async line => {
                    const match = line.match(/allow from (\d+\.\d+\.\d+\.\d+)\/(\d+)/);
                    if (!match) return null;

                    const ip = match[1];
                    const subnet = parseInt(match[2]);
                    console.log(`Checking status for IP: ${ip}`);
                    
                    const isAlive = await checkIPStatus(ip);
                    console.log(`${ip} status:`, isAlive ? 'online' : 'offline');

                    return {
                        ip,
                        subnet,
                        status: isAlive ? 'online' : 'offline',
                        coordinates: [
                            45.166244 + (Math.random() - 0.5) * 0.1, // Add some random spread
                            -12.8275 + (Math.random() - 0.5) * 0.1
                        ]
                    };
                })
        );

        // Group by network class
        const networkGroups = ranges
            .filter(range => range !== null)
            .reduce((acc, range) => {
                const networkKey = range.ip.split('.').slice(0, 2).join('.');
                if (!acc[networkKey]) {
                    acc[networkKey] = {
                        network: networkKey,
                        coordinates: range.coordinates,
                        rangeCount: 0,
                        onlineCount: 0,
                        ranges: [],
                        status: 'offline'
                    };
                }
                acc[networkKey].rangeCount++;
                if (range.status === 'online') {
                    acc[networkKey].onlineCount++;
                }
                acc[networkKey].ranges.push(range);
                acc[networkKey].status = acc[networkKey].onlineCount > 0 ? 'online' : 'offline';
                return acc;
            }, {});

        const networkAreas = Object.values(networkGroups);
        console.log(`Created ${networkAreas.length} network areas with status`);

        return {
            ranges: ranges.filter(r => r !== null),
            networkAreas
        };
    } catch (error) {
        console.error('Error in loadFirewallRanges:', error);
        return { ranges: [], networkAreas: [] };
    }
}

module.exports = { loadFirewallRanges };