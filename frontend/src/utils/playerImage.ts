// DiceBear pixel-art avatar — instant fallback, works for every player.
export function getPlayerImageUrl(name: string): string {
  return `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(name)}&backgroundColor=161b22`;
}

// ─── Real photo via Wikipedia REST API ────────────────────────────────────────
// Wikipedia's page-summary endpoint returns the lead image for any article.
// For famous footballers this is a real face photo hosted on Wikimedia Commons.
// No API key needed, no rate limits for normal usage.

const photoCache = new Map<string, string | null>();

function toWikiTitle(name: string): string {
  // "jamal musiala" → "Jamal_Musiala"
  return name
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
}

export async function fetchRealPlayerPhoto(name: string): Promise<string | null> {
  const key = name.toLowerCase().trim();
  if (photoCache.has(key)) return photoCache.get(key)!;

  const title = toWikiTitle(key);
  const url   = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const res  = await fetch(url);
    if (!res.ok) { photoCache.set(key, null); return null; }
    const data = await res.json();
    // Prefer original (higher-res) over thumbnail; either is a real photo.
    const photo: string | null =
      data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
    photoCache.set(key, photo);
    return photo;
  } catch {
    photoCache.set(key, null);
    return null;
  }
}
