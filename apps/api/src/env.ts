import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ENV_FILE_NAME = '.env'

export function findRepoRoot(start: string = process.cwd()): string | null {
  let dir = start
  for (;;) {
    const marker = join(dir, 'package.json')
    if (existsSync(marker)) {
      try {
        const pkg = JSON.parse(readFileSync(marker, 'utf8')) as { workspaces?: unknown }
        if (pkg.workspaces) return dir
      } catch {
        // invalid package.json — keep walking
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!key) continue
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

export function loadEnv(root: string | null = findRepoRoot()): void {
  if (!root) return
  const envPath = join(root, ENV_FILE_NAME)
  if (!existsSync(envPath)) return
  const values = parseEnvFile(readFileSync(envPath, 'utf8'))
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}
