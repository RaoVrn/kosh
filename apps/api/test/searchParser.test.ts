import { describe, expect, it } from 'vitest'
import { parseSearchQuery } from '../src/search/queryParser.js'
import { SearchValidationError } from '../src/search/queryParser.js'

describe('parseSearchQuery', () => {
  it('parses plain text and phrases', () => {
    const parsed = parseSearchQuery('meeting manager')
    expect(parsed.textTerms).toEqual(['meeting', 'manager'])
    expect(parsed.phrases).toEqual([])

    const phrased = parseSearchQuery('"requirement review" architecture')
    expect(parsed.textTerms).toEqual(['meeting', 'manager'])
    expect(phrased.phrases).toEqual(['requirement review'])
    expect(phrased.textTerms).toEqual(['architecture'])
  })

  it('parses type and status operators (case-insensitive)', () => {
    const parsed = parseSearchQuery('TYPE:task Status:ACTIVE python')
    expect(parsed.type).toBe('task')
    expect(parsed.status).toBe('active')
    expect(parsed.textTerms).toEqual(['python'])
  })

  it('parses quoted project names', () => {
    const parsed = parseSearchQuery('project:"Requirement Review Agent"')
    expect(parsed.project).toBe('Requirement Review Agent')
  })

  it('parses unquoted project and tag operators', () => {
    const parsed = parseSearchQuery('project:kosh tag:python tag:ai')
    expect(parsed.project).toBe('kosh')
    expect(parsed.tags).toEqual(['python', 'ai'])
  })

  it('parses before/after as UTC boundaries', () => {
    const parsed = parseSearchQuery('before:2026-09-01 after:2026-01-15')
    expect(parsed.before).toBe('2026-09-01T00:00:00.000Z')
    expect(parsed.after).toBe('2026-01-15T00:00:00.000Z')
  })

  it('parses has:attachment', () => {
    expect(parseSearchQuery('has:attachment').hasAttachment).toBe(true)
    expect(parseSearchQuery('HAS:ATTACHMENT').hasAttachment).toBe(true)
    expect(parseSearchQuery('plain text').hasAttachment).toBe(false)
  })

  it('combines mixed operators with text', () => {
    const parsed = parseSearchQuery('tag:ai type:learning has:attachment agents')
    expect(parsed.tags).toEqual(['ai'])
    expect(parsed.type).toBe('learning')
    expect(parsed.hasAttachment).toBe(true)
    expect(parsed.textTerms).toEqual(['agents'])
  })

  it('tolerates whitespace and empty input', () => {
    expect(parseSearchQuery('   ').textTerms).toEqual([])
    expect(parseSearchQuery('  python   notes  ').textTerms).toEqual(['python', 'notes'])
  })

  it('rejects invalid dates', () => {
    expect(() => parseSearchQuery('before:2026-13-01')).toThrow(SearchValidationError)
    expect(() => parseSearchQuery('after:yesterday')).toThrow(SearchValidationError)
    expect(() => parseSearchQuery('before:2026-09-32')).toThrow(SearchValidationError)
  })

  it('rejects invalid types and statuses', () => {
    expect(() => parseSearchQuery('type:project')).toThrow(SearchValidationError)
    expect(() => parseSearchQuery('status:pending')).toThrow(SearchValidationError)
  })

  it('falls back safely for unknown operator-like tokens', () => {
    const parsed = parseSearchQuery('project: type:')
    expect(parsed.textTerms).toContain('project:')
    expect(parsed.textTerms).toContain('type:')
  })

  it('does not treat operator tokens as text', () => {
    const parsed = parseSearchQuery('type:task python')
    expect(parsed.textTerms).not.toContain('type:task')
  })
})
