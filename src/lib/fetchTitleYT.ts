

export async function fetchTitleYT(url: string): Promise<string | undefined> {

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch URL: ${url}, status: ${res.status}`);
      return undefined;
    }
    const html = await res.text();
    const match = html.match(/<title>(.*?)<\/title>/);
    if (match && match[1]) {
      // YouTube titles are usually in the format "Video Title - YouTube"
      const title = match[1].replace(' - YouTube', '').trim();
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