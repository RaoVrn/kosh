export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0
  } catch {
    return false
  }
}

export function domainFromUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.hostname || null
  } catch {
    return null
  }
}
