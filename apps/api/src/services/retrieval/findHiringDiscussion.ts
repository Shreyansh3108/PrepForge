export async function findHiringDiscussion(companyName: string): Promise<string> {
  const query = encodeURIComponent(`${companyName} interview process questions`);
  // Reddit JSON API is free and requires no key for basic queries
  const url = `https://www.reddit.com/search.json?q=${query}&limit=3`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PrepForge-Bot/1.0 (Contact: local@prepforge.dev)' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return "No public discussion found.";

    const data = await response.json();
    const posts = data?.data?.children || [];
    
    if (posts.length === 0) return "No public discussion found.";

    const discussion = posts
      .map((p: any) => p.data.selftext || p.data.title)
      .join("\n\n---\n\n")
      .substring(0, 5000); 

    return discussion.trim() || "No public discussion found.";
  } catch {
    return "No public discussion found.";
  }
}