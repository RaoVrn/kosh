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
