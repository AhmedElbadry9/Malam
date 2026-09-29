/**
 * URL and Agency Email Helper Utilities
 */

/**
 * Extracts a clean brand identifier from a website URL.
 * Examples:
 *  - "www.saleh.com" -> "saleh"
 *  - "https://www.saleh.com" -> "saleh"
 *  - "http://saleh.sa" -> "saleh"
 *  - "saleh.com.sa" -> "saleh"
 *  - "store.saleh.com" -> "saleh"
 *  - "https://store-alanaqa.com/products" -> "store-alanaqa"
 */
export function extractBrandFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().toLowerCase();

  // Strip protocol
  clean = clean.replace(/^https?:\/\//, '');

  // Strip leading www.
  clean = clean.replace(/^www\./, '');

  // If path is a store handle on salla or zid platforms (e.g., salla.sa/mystore or zid.store/mystore)
  const platformSubPathMatch = clean.match(/^(?:salla\.(?:sa|com)|zid\.(?:store|sa))\/([a-z0-9_-]+)/i);
  if (platformSubPathMatch && platformSubPathMatch[1]) {
    return platformSubPathMatch[1].toLowerCase();
  }

  // Strip path, query, hash
  clean = clean.split('/')[0].split('?')[0].split('#')[0];

  const parts = clean.split('.').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return parts[0].replace(/[^a-z0-9_-]/g, '');
  }

  // Common TLDs to peel off from the end
  const commonTlds = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'co', 'me', 'io', 'ai', 'app', 'site',
    'store', 'shop', 'online', 'tech', 'dev', 'agency', 'sa', 'ae', 'eg', 'kw',
    'bh', 'om', 'qa', 'uk', 'us', 'eu', 'de', 'fr'
  ]);

  const brandParts = [...parts];
  while (brandParts.length > 1 && commonTlds.has(brandParts[brandParts.length - 1])) {
    brandParts.pop();
  }

  const brand = brandParts[brandParts.length - 1] || parts[0];
  return brand.replace(/[^a-z0-9_-]/g, '');
}

/**
 * Generates agency email alias for the client:
 * Output: info+[brand]@malamsa.com
 */
export function generateAgencyEmail(url: string): string {
  const brand = extractBrandFromUrl(url);
  if (!brand) return '';
  return `info+${brand}@malamsa.com`;
}

/**
 * Safely converts any user-inputted link into an absolute external URL.
 * Prevents the SPA router from treating domain-only or relative strings as local routes.
 */
export function toSafeExternalUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Parses deliverable URLs stored in a task stage.
 * Supports multiple URLs separated by newlines or commas,
 * while safely preserving single URLs.
 */
export function parseDeliverableUrls(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map(u => u.trim())
    .filter(u => u.length > 0);
}
