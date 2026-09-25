import * as cheerio from "cheerio";
import { isAllowedUrl } from "./robots";

export async function crawlCompanySite(baseUrl: string): Promise<string[]> {
  if (!(await isAllowedUrl(baseUrl))) return [];

  try {
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': 'PrepForge-Bot/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const candidateLinks = new Set<string>();
    const base = new URL(baseUrl);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      try {
        const resolvedUrl = new URL(href, base.origin);
        // Restrict to same-origin to avoid following external social links
        if (resolvedUrl.hostname === base.hostname) {
          candidateLinks.add(resolvedUrl.href);
        }
      } catch {
        // Ignore malformed hrefs
      }
    });

    // Score links based on hiring relevance
    const keywords = ['career', 'job', 'about', 'team', 'hiring', 'culture', 'handbook'];
    const ranked = Array.from(candidateLinks).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aScore = keywords.reduce((score, kw) => score + (aLower.includes(kw) ? 1 : 0), 0);
      const bScore = keywords.reduce((score, kw) => score + (bLower.includes(kw) ? 1 : 0), 0);
      return bScore - aScore; // Descending order
    });

    // Return the root URL plus the top 4 most relevant paths
    return Array.from(new Set([baseUrl, ...ranked.slice(0, 4)]));
  } catch {
    return [];
  }
}