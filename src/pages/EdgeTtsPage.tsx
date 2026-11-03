import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { apiUrl, isRecord, requestAudio, requestJson } from '../api'
import { ServiceFrame } from '../ServiceFrame'

type Voice = {
  shortName: string
  gender: string
  locale: string
  friendlyName: string
  language: string
  status: string
}

function readVoices(body: unknown): Voice[] {
  if (!Array.isArray(body)) throw new Error('返回格式无法识别')
  return body.flatMap((item) => {
    if (!isRecord(item) || typeof item.ShortName !== 'string') return []
    return [
      {
        shortName: item.ShortName,
        gender: typeof item.Gender === 'string' ? item.Gender : '',
        locale: typeof item.Locale === 'string' ? item.Locale : '',
        friendlyName: typeof item.FriendlyName === 'string' ? item.FriendlyName : '',
        language: typeof item.Language === 'string' ? item.Language : '',
        status: typeof item.Status === 'string' ? item.Status : '',
      },
    ]
  })
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败'
}

function EdgeTtsConsole({ password, base }: { password: string; base: string }) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [locale, setLocale] = useState('en-US')
  const [gender, setGender] = useState('Female')
  const [query, setQuery] = useState('')
  const [voice, setVoice] = useState('en-US-AriaNeural')
  const [text, setText] = useState('Hello, this is a speech test.')
  const [busy, setBusy] = useState<'voices' | 'tts' | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioSize, setAudioSize] = useState(0)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const filtered = useMemo(() => {
    const localeQuery = locale.trim().toLowerCase()
    const textQuery = query.trim().toLowerCase()
    return voices
      .filter((item) => {
        if (localeQuery && !item.locale.toLowerCase().includes(localeQuery)) return false
        if (gender && item.gender !== gender) return false
        if (!textQuery) return true
        return (
          item.shortName.toLowerCase().includes(textQuery) ||
          item.friendlyName.toLowerCase().includes(textQuery) ||
          item.language.toLowerCase().includes(textQuery)
        )
      })
      .sort((a, b) => a.locale.localeCompare(b.locale) || a.shortName.localeCompare(b.shortName))
  }, [voices, locale, gender, query])

  async function onLoadVoices() {
    setBusy('voices')
    setVoiceError(null)
    try {
      const body = await requestJson(apiUrl(base, 'voice').toString(), 'password', password)
      setVoices(readVoices(body))
    } catch (error) {
      setVoiceError(errorText(error))
    } finally {
      setBusy(null)
    }
  }

  async function onSpeak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const spoken = text.trim()
    const selected = voice.trim()
    if (!spoken || !selected) {
      setTtsError('请填写 text 和 voice')
      return
    }
    setBusy('tts')
    setTtsError(null)
    try {
      const url = apiUrl(base, 'tts')
      url.searchParams.set('text', spoken)
      url.searchParams.set('voice', selected)
      const blob = await requestAudio(url.toString(), 'password', password)
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      const nextUrl = URL.createObjectURL(blob)
      audioUrlRef.current = nextUrl
      setAudioUrl(nextUrl)
      setAudioSize(blob.size)
    } catch (error) {
      setTtsError(errorText(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>语音列表</h2>
        <p className="meta">
          <code>GET /voice</code>
        </p>
        <div className="actions">
          <label className="field">
            Locale
            <input
              value={locale}
              placeholder="例如 en-US，留空为全部"
              onChange={(event) => setLocale(event.target.value)}
            />
          </label>
          <label className="field">
            Gender
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">全部</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </label>
          <label className="field grow">
            搜索
            <input
              value={query}
              placeholder="ShortName、名称或语言"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="primary" type="button" disabled={busy !== null} onClick={() => void onLoadVoices()}>
            {busy === 'voices' ? '获取中…' : '获取全部语音'}
          </button>
        </div>
        {voiceError ? (
          <p className="notice error" role="alert">
            {voiceError}
          </p>
        ) : null}
        {voices.length > 0 ? (
          <p className="meta">
            显示 {filtered.length} / {voices.length}
          </p>
        ) : null}
        {voices.length > 0 && filtered.length === 0 ? <p className="meta">没有匹配的语音。</p> : null}
        {filtered.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ShortName</th>
                  <th>Locale</th>
                  <th>Gender</th>
                  <th>名称</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.shortName} className={item.shortName === voice ? 'selected' : undefined}>
                    <td>{item.shortName}</td>
                    <td>{item.locale}</td>
                    <td>{item.gender}</td>
                    <td className="wrap">{item.friendlyName}</td>
                    <td>{item.status}</td>
                    <td>
                      <button className="ghost" type="button" onClick={() => setVoice(item.shortName)}>
                        选用
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>文字转语音</h2>
        <p className="meta">
          <code>GET /tts</code>
        </p>
        <form className="stack" onSubmit={(event) => void onSpeak(event)}>
          <label className="field">
            voice
            <input
              value={voice}
              list="voice-names"
              spellCheck={false}
              onChange={(event) => setVoice(event.target.value)}
              required
            />
            <datalist id="voice-names">
              {filtered.map((item) => (
                <option key={item.shortName} value={item.shortName}>
                  {item.friendlyName}
                </option>
              ))}
            </datalist>
          </label>
          <label className="field">
            text
            <textarea value={text} onChange={(event) => setText(event.target.value)} required />
          </label>
          <div className="actions">
            <button className="primary" type="submit" disabled={busy !== null}>
              {busy === 'tts' ? '合成中…' : '合成'}
            </button>
          </div>
        </form>
        {ttsError ? (
          <p className="notice error" role="alert">
            {ttsError}
          </p>
        ) : null}
        {audioUrl ? (
          <div className="stack">
            <p className="meta">已生成音频（{Math.max(1, Math.round(audioSize / 1024))} KB）</p>
            <audio key={audioUrl} controls autoPlay src={audioUrl} />
          </div>
        ) : null}
      </section>
    </div>
  )
}

export function EdgeTtsPage() {
  return (
    <ServiceFrame service="edge-tts" title="Edge TTS" placeholder="https://edge-tts.fastapicloud.dev/">
      {({ prefix, password }) => <EdgeTtsConsole password={password} base={prefix} />}
    </ServiceFrame>
  )
}
