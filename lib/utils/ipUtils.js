// /home/soc_portal/lib/utils/ipUtils.js

/**
 * Extract client IP from request headers
 * Handles IPv4, IPv6, and Nginx proxy scenarios
 */
export function getClientIP(request) {
    // Try different headers in order of preference
    const headers = [
        'x-real-ip',
        'x-forwarded-for', 
        'cf-connecting-ip',
        'true-client-ip'
    ];
    
    let ip = 'Unknown IP';
    
    for (const header of headers) {
        const value = request.headers.get(header);
        if (value) {
            // Handle comma-separated lists (x-forwarded-for)
            const ips = value.split(',').map(ip => ip.trim());
            ip = ips[0]; // First IP is the client
            
            // Extract IPv4 from IPv6-mapped address (::ffff:123.200.7.106)
            if (ip.startsWith('::ffff:')) {
                ip = ip.substring(7); // Remove ::ffff: prefix
            }
            
            // Validate IP format
            if (isValidIP(ip)) {
                break;
            }
        }
    }
    
    // Fallback to direct connection IP
    if (ip === 'Unknown IP') {
        const connection = request.headers.get('x-forwarded-for') || 'Unknown IP';
        if (connection !== 'Unknown IP') {
            ip = connection.split(',')[0].trim();
            if (ip.startsWith('::ffff:')) {
                ip = ip.substring(7);
            }
        }
    }
    
    return ip;
}

/**
 * Validate IP address format
 */
function isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export default getClientIP;