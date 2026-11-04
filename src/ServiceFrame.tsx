import { useState, type FormEvent, type ReactNode } from 'react'
import { readPassword, savePassword } from './password'
import { normalizePrefix, readPrefix, savePrefix, type ServiceId } from './prefix'

export function ServiceFrame({
  service,
  title,
  placeholder,
  verify,
  children,
}: {
  service: ServiceId
  title: string
  placeholder: string
  verify?: (config: { prefix: string; password: string }) => Promise<void>
  children: (config: { prefix: string; password: string }) => ReactNode
}) {
  const [prefix, setPrefix] = useState(() => readPrefix(service))
  const [password, setPassword] = useState(readPassword)
  const [editing, setEditing] = useState(() => !readPrefix(service) || !readPassword())
  const [prefixDraft, setPrefixDraft] = useState(() => readPrefix(service))
  const [passwordDraft, setPasswordDraft] = useState(readPassword)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openSettings() {
    setPrefixDraft(prefix)
    setPasswordDraft(password)
    setVisible(false)
    setError(null)
    setEditing(true)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextPrefix = prefixDraft.trim()
    const nextPassword = passwordDraft.trim()
    if (!nextPrefix || !nextPassword) {
      setError('请填写前缀和 password')
      return
    }
    let normalized: string
    try {
      normalized = normalizePrefix(nextPrefix)
    } catch {
      setError('前缀需要是 http 或 https 地址')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (verify) await verify({ prefix: normalized, password: nextPassword })
      savePrefix(service, normalized)
      savePassword(nextPassword)
      setPrefix(normalized)
      setPassword(nextPassword)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <header className="top">
        <a className="back" href="#/">
          返回
        </a>
        <h1>{title}</h1>
        <button className="ghost" type="button" onClick={openSettings}>
          设置
        </button>
      </header>
      {editing ? (
        <form className="gate" onSubmit={(event) => void onSubmit(event)}>
          <label>
            前缀
            <input
              name="prefix"
              type="url"
              value={prefixDraft}
              placeholder={placeholder}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setPrefixDraft(event.target.value)
                setError(null)
              }}
              required
            />
          </label>
          <label>
            password
            <input
              name="password"
              type={visible ? 'text' : 'password'}
              value={passwordDraft}
              autoComplete="current-password"
              spellCheck={false}
              onChange={(event) => {
                setPasswordDraft(event.target.value)
                setError(null)
              }}
              required
            />
          </label>
          <div className="actions">
            <button className="primary" type="submit" disabled={busy}>
              {busy ? '验证中…' : '保存'}
            </button>
            <button className="ghost" type="button" onClick={() => setVisible((value) => !value)}>
              {visible ? '隐藏' : '显示'}
            </button>
            {prefix && password ? (
              <button
                className="ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditing(false)
                  setError(null)
                }}
              >
                取消
              </button>
            ) : null}
          </div>
          {error ? (
            <p className="notice error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        children({ prefix, password })
      )}
    </main>
  )
}
