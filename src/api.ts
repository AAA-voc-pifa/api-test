type PasswordHeader = 'password' | 'Authentication'

export function apiUrl(base: string, path: string): URL {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return new URL(path.replace(/^\/+/, ''), prefix)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function explainFailure(status: number, body: unknown): string {
  let detail = ''
  if (typeof body === 'string') {
    detail = body.trim()
  } else if (isRecord(body)) {
    if (typeof body.error === 'string') detail = body.error
    else if (typeof body.detail === 'string') detail = body.detail
    else if (body.detail !== undefined) detail = JSON.stringify(body.detail)
  }
  if (status === 0) return detail || '网络错误，未能连上接口'
  if (detail) return `${status} ${detail}`
  return `请求失败（${status}）`
}

async function send(
  url: string,
  headerName: PasswordHeader,
  password: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set(headerName, password)
  try {
    return await fetch(url, { ...init, headers })
  } catch {
    throw new Error('网络错误，未能连上接口')
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function requestJson(
  url: string,
  headerName: PasswordHeader,
  password: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await send(url, headerName, password, init)
  const body = await readBody(res)
  if (!res.ok) throw new Error(explainFailure(res.status, body))
  if (isRecord(body) && body.ok === false) throw new Error(explainFailure(res.status, body))
  return body
}

export async function requestOk(
  url: string,
  headerName: PasswordHeader,
  password: string,
  init?: RequestInit,
): Promise<void> {
  const res = await send(url, headerName, password, init)
  if (res.status === 204) return
  const body = await readBody(res)
  if (!res.ok) throw new Error(explainFailure(res.status, body))
  if (isRecord(body) && body.ok === false) throw new Error(explainFailure(res.status, body))
}

export async function requestAudio(
  url: string,
  headerName: PasswordHeader,
  password: string,
): Promise<Blob> {
  const res = await send(url, headerName, password)
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !type.includes('audio')) {
    const body = await readBody(res)
    throw new Error(explainFailure(res.status || 0, body))
  }
  return res.blob()
}
