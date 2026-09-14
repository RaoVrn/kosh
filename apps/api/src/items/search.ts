export function buildFtsQuery(raw: string): string | null {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 20)
  if (words.length === 0) return null
  return words.map((w) => `"${w}"`).join(' AND ')
}

/**
 * Builds an FTS5 query from plain text terms plus quoted phrases.
 * Words are escaped and matched as exact tokens; phrases are preserved as
 * FTS5 phrases. Terms like "AI" or "python" keep working.
 */
export function buildFtsTextQuery(textTerms: string[], phrases: string[]): string | null {
  const parts: string[] = []
  for (const phrase of phrases) {
    const cleaned = phrase.trim().replace(/"/g, ' ')
    if (cleaned.length > 0) parts.push(`"${cleaned}"`)
  }
  for (const term of textTerms) {
    const cleaned = term.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    for (const word of cleaned.split(' ').filter((w) => w.length > 1)) {
      parts.push(`"${word}"`)
    }
  }
  if (parts.length === 0) return null
  return parts.slice(0, 30).join(' AND ')
}
