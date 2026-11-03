const PREFIX_KEYS = {
  'edge-tts': 'edge-tts-prefix',
  voc: 'voc-prefix',
} as const

export type ServiceId = keyof typeof PREFIX_KEYS

export function normalizePrefix(value: string): string {
  const url = new URL(value.trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('前缀需要是 http 或 https 地址')
  }
  const path = url.pathname.replace(/\/+$/, '')
  return `${url.origin}${path}`
}

export function readPrefix(service: ServiceId): string {
  try {
    const raw = localStorage.getItem(PREFIX_KEYS[service])?.trim() ?? ''
    if (!raw) return ''
    return normalizePrefix(raw)
  } catch {
    return ''
  }
}

export function savePrefix(service: ServiceId, prefix: string) {
  localStorage.setItem(PREFIX_KEYS[service], normalizePrefix(prefix))
}
