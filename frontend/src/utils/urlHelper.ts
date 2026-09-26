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

  // Strip path, query, hash
  clean = clean.split('/')[0].split('?')[0].split('#')[0];

  // Strip port
  clean = clean.split(':')[0];

  // Strip leading www.
  clean = clean.replace(/^www\./, '');

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
