export interface AiConfig {
  baseUrl: string
  apiKey: string | null
  model: string
  transcriptionModel: string
  timeoutMs: number
  transcriptionTimeoutMs: number
}

export function getAiConfig(): AiConfig {
  return {
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY?.trim() || null,
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    transcriptionModel: process.env.TRANSCRIPTION_MODEL ?? 'whisper-large-v3-turbo',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
    transcriptionTimeoutMs: Number(process.env.TRANSCRIPTION_TIMEOUT_MS ?? 30000),
  }
}

export function isAiEnabled(config: AiConfig): boolean {
  return Boolean(config.apiKey)
}