import * as cheerio from "cheerio";
import { isAllowedUrl } from "./robots";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB limit

export async function fetchPage(url: string): Promise<{ url: string; content: string } | null> {
  if (!(await isAllowedUrl(url))) return null;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PrepForge-Bot/1.0' },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    const size = Number(response.headers.get('content-length'));
    if (size > MAX_SIZE) return null;

    const html = await response.text();
    if (html.length > MAX_SIZE) return null; 

    const $ = cheerio.load(html);
    
    // Strip irrelevant layout nodes
    $('script, style, nav, footer, header, noscript, iframe, svg').remove();
    
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return { url, content: text.substring(0, 15000) }; // Cap char count for token limits
  } catch (error) {
    return null; // Graceful failure on unreachable pages
  }
}