

export async function fetchTitle(url: string): Promise<string | undefined> {

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.error(`Failed to fetch URL: ${url}, status: ${res.status}`);
      return undefined;
    }
    const html = await res.text();
    const match = html.match(/<title>(.*?)<\/title>/);
    if (match && match[1]) {
      const title = 
        /(?:youtube\.com|youtu\.be)/i.test(url) ? match[1].replace(' - YouTube', '').trim() 
        : match[1].trim();
      return title;
    } else {
      console.error(`Title not found in HTML for URL: ${url}`);
      return undefined;
    }
  } catch (error) {
    console.error(`Error fetching title from URL: ${url}`, error);
    return undefined;
  }
}