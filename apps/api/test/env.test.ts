import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findRepoRoot, loadEnv, parseEnvFile } from '../src/env.js'

describe('parseEnvFile', () => {
  it('parses KEY=VALUE lines and ignores comments and blanks', () => {
    const parsed = parseEnvFile(`
# comment
AI_API_KEY=sk-groq-secret

AI_BASE_URL = https://api.groq.com/openai/v1
TRANSCRIPTION_MODEL="whisper-large-v3-turbo"
PORT=3001
`)
    expect(parsed).toEqual({
      AI_API_KEY: 'sk-groq-secret',
      AI_BASE_URL: 'https://api.groq.com/openai/v1',
      TRANSCRIPTION_MODEL: 'whisper-large-v3-turbo',
      PORT: '3001',
    })
  })

  it('skips malformed lines', () => {
    expect(parseEnvFile('=novalue\nNOEQUALS\n# x\n\nFOO=bar')).toEqual({ FOO: 'bar' })
  })
})

describe('findRepoRoot', () => {
  it('finds the monorepo root from a workspace directory', () => {
    const root = findRepoRoot()
    expect(root).toBeTruthy()
    const pkg = JSON.parse(readFileSync(join(root!, 'package.json'), 'utf8'))
    expect(pkg.workspaces).toBeTruthy()
  })

  it('returns the directory itself when it is the root', () => {
    const root = findRepoRoot()
    expect(findRepoRoot(root!)).toBe(root)
  })

  it('returns null when no workspace root exists above', () => {
    expect(findRepoRoot('/')).toBeNull()
  })
})

describe('loadEnv', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kosh-env-'))
    mkdirSync(join(dir, 'apps', 'api'), { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('loads .env from the repo root without overriding existing env vars', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'kosh', workspaces: ['apps/*'] }),
    )
    writeFileSync(
      join(dir, '.env'),
      'AI_API_KEY=from-file\nTRANSCRIPTION_MODEL=whisper-large-v3-turbo\nPORT=3999\n',
    )

    const previous = { ...process.env }
    process.env.AI_API_KEY = 'from-shell'
    delete process.env.TRANSCRIPTION_MODEL
    delete process.env.PORT
    try {
      loadEnv(dir)
      expect(process.env.AI_API_KEY).toBe('from-shell')
      expect(process.env.TRANSCRIPTION_MODEL).toBe('whisper-large-v3-turbo')
      expect(process.env.PORT).toBe('3999')
    } finally {
      process.env = previous
    }
  })

  it('is a no-op when there is no .env', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'kosh', workspaces: ['apps/*'] }),
    )
    expect(() => loadEnv(dir)).not.toThrow()
  })
})
