import { describe, expect, it } from 'vitest'
import { domainFromUrl, isValidHttpUrl } from '@kosh/shared'

describe('url utils', () => {
  it('validates http(s) URLs', () => {
    expect(isValidHttpUrl('https://example.com/rag-guide')).toBe(true)
    expect(isValidHttpUrl('http://localhost:3001')).toBe(true)
    expect(isValidHttpUrl('not-a-url')).toBe(false)
    expect(isValidHttpUrl('ftp://example.com/x')).toBe(false)
    expect(isValidHttpUrl('')).toBe(false)
  })

  it('extracts the domain from a URL', () => {
    expect(domainFromUrl('https://example.com/rag-guide')).toBe('example.com')
    expect(domainFromUrl('https://docs.docker.com/network/')).toBe('docs.docker.com')
    expect(domainFromUrl('not-a-url')).toBeNull()
  })
})
