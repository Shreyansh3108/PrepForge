import dns from 'dns/promises';

function isPrivateIP(ip: string): boolean {
  return /^(127\.)|(10\.)|(172\.1[6-9]\.)|(172\.2[0-9]\.)|(172\.3[0-1]\.)|(192\.168\.)|(::1)$/.test(ip);
}

export async function isAllowedUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    
    // In production, block internal IP addresses and loopback addresses
    if (process.env.NODE_ENV === 'production') {
      if (url.hostname === 'localhost' || isPrivateIP(url.hostname)) {
        return false;
      }
      // Resolve the DNS to catch domains pointing to local IPs
      const addresses = await dns.resolve(url.hostname).catch(() => []);
      if (addresses.some(isPrivateIP)) {
        return false;
      }
    }
    
    return true; 
  } catch {
    return false; // Malformed URL
  }
}