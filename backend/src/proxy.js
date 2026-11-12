import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

// Check if IP is private, loopback, or cloud metadata
function isBlockedIp(ip) {
  // IPv4 Loopback (127.0.0.0/8) or 0.0.0.0
  if (/^127\./.test(ip) || ip === '0.0.0.0') return true;

  // IPv6 Loopback
  if (ip === '::1' || ip === '::') return true;

  // AWS/Azure/GCP Metadata & Link-Local (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;

  // Private RFC 1918 ranges
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 172.16.0.0/12 (172.16.0.0 to 172.31.255.255)
  const m172 = ip.match(/^172\.(\d+)\./);
  if (m172) {
    const secondOctet = parseInt(m172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;

  // IPv6 Private / Link-Local
  if (/^(fc|fd|fe80)/i.test(ip)) return true;

  return false;
}

export async function forwardApiRequest({ url, method = 'GET', headers = {}, body = '' }) {
  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed.');
  }

  // SSRF Protection: Resolve hostname and check IP
  try {
    const lookup = await dns.lookup(targetUrl.hostname, { all: true });
    for (const record of lookup) {
      if (isBlockedIp(record.address)) {
        throw new Error(`SSRF Blocked: Address ${record.address} is an internal or restricted network target.`);
      }
    }
  } catch (err) {
    if (err.message.startsWith('SSRF Blocked:')) throw err;
    throw new Error(`Could not resolve hostname: ${targetUrl.hostname}`);
  }

  // Strip dangerous hop-by-hop headers
  const safeHeaders = { ...headers };
  delete safeHeaders['host'];
  delete safeHeaders['connection'];
  delete safeHeaders['content-length'];

  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const start = performance.now();

  return new Promise((resolve, reject) => {
    const reqOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: method.toUpperCase(),
      headers: safeHeaders,
      timeout: 15000 // 15 second timeout
    };

    const req = client.request(reqOptions, (res) => {
      const chunks = [];
      let totalBytes = 0;

      res.on('data', (chunk) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        // Limit max response to 10MB
        if (totalBytes > 10 * 1024 * 1024) {
          req.destroy(new Error('Response size limit (10MB) exceeded.'));
        }
      });

      res.on('end', () => {
        const timeMs = Math.round(performance.now() - start);
        const buffer = Buffer.concat(chunks);
        const resBody = buffer.toString('utf8');

        const resHeaders = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) resHeaders[k] = v.join(', ');
          else if (v != null) resHeaders[k] = String(v);
        }

        resolve({
          status: res.statusCode || 200,
          reason: res.statusMessage || 'OK',
          time_ms: timeMs,
          size: totalBytes,
          body: resBody,
          headers: resHeaders
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out after 15 seconds.'));
    });

    req.on('error', (err) => {
      reject(new Error(`API request error: ${err.message}`));
    });

    if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

