// utils/ip.js
function normalizeIp(rawIp) {
  if (!rawIp) return null;
  rawIp = String(rawIp).trim();

  // IPv4-mapped IPv6: ::ffff:127.0.0.1 -> 127.0.0.1
  const ipv4Match = rawIp.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match) return ipv4Match[1];

  // IPv6 loopback to IPv4 loopback (optional)
  if (rawIp === '::1') return '127.0.0.1';

  // If header has multiple IPs (X-Forwarded-For), take first one
  if (rawIp.includes(',')) {
    return rawIp.split(',')[0].trim();
  }

  // strip port if present like "127.0.0.1:54321"
  const portIndex = rawIp.lastIndexOf(':');
  if (portIndex > -1 && rawIp.includes('.')) { // contains dots -> IPv4 with port
    return rawIp.split(':')[0];
  }

  // otherwise return as-is (could be IPv6)
  return rawIp;
}

module.exports = { normalizeIp };
