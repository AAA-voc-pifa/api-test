import { useState, type FormEvent } from 'react'
import { apiUrl, isRecord, requestJson, requestOk } from '../api'
import { ServiceFrame } from '../ServiceFrame'

type VocWord = {
  word: string
  points: number
  addAt: string
  updateAt: string
}

type ListMode = { type: 'all' } | { type: 'lowest'; count: number; points: number }

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败'
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-CN', { hour12: false })
}

function readWord(item: unknown): VocWord | null {
  if (!isRecord(item) || typeof item.word !== 'string') return null
  return {
    word: item.word,
    points: typeof item.points === 'number' ? item.points : 0,
    addAt: typeof item.add_at === 'string' ? item.add_at : '',
    updateAt: typeof item.update_at === 'string' ? item.update_at : '',
  }
}

function readWords(body: unknown): VocWord[] {
  if (!isRecord(body) || !Array.isArray(body.data)) throw new Error('返回格式无法识别')
  return body.data.flatMap((item) => {
    const word = readWord(item)
    return word ? [word] : []
  })
}

function wordUrl(base: string, word: string): string {
  return apiUrl(base, `voc/${encodeURIComponent(word)}`).toString()
}

function VocConsole({ password, base }: { password: string; base: string }) {
  const [countText, setCountText] = useState('20')
  const [addPointsText, setAddPointsText] = useState('1')
  const [word, setWord] = useState('')
  const [pointsText, setPointsText] = useState('0')
  const [words, setWords] = useState<VocWord[]>([])
  const [listMode, setListMode] = useState<ListMode | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function fetchWords(mode: ListMode): Promise<VocWord[]> {
    const url = apiUrl(base, mode.type === 'all' ? 'voc/all' : 'voc')
    if (mode.type === 'lowest') {
      url.searchParams.set('count', String(mode.count))
      url.searchParams.set('points', String(mode.points))
    }
    const body = await requestJson(url.toString(), 'Authentication', password)
    return readWords(body)
  }

  async function loadList(mode: ListMode, action: string) {
    setBusy(action)
    setListError(null)
    try {
      setWords(await fetchWords(mode))
      setListMode(mode)
    } catch (error) {
      setListError(errorText(error))
    } finally {
      setBusy(null)
    }
  }

  function onLowest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const count = Number(countText)
    if (!Number.isInteger(count) || count < 1 || count > 10000) {
      setListError('count 需要是 1 到 10000 的整数')
      return
    }
    if (addPointsText.trim() === '' || !Number.isInteger(Number(addPointsText))) {
      setListError('points 需要是整数')
      return
    }
    void loadList({ type: 'lowest', count, points: Number(addPointsText) }, 'lowest')
  }

  async function reload() {
    if (!listMode || listMode.type === 'lowest') return
    try {
      setWords(await fetchWords(listMode))
      setListError(null)
    } catch (error) {
      setListError(errorText(error))
    }
  }

  async function runAction(action: string, task: () => Promise<string>) {
    setBusy(action)
    setNotice(null)
    try {
      const text = await task()
      setNotice({ kind: 'ok', text })
      await reload()
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) })
    } finally {
      setBusy(null)
    }
  }

  function requireWord(): string {
    const next = word.trim()
    if (!next) throw new Error('请填写单词')
    return next
  }

  function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runAction('add', async () => {
      const next = requireWord()
      await requestJson(wordUrl(base, next), 'Authentication', password, { method: 'POST' })
      return `已添加「${next}」`
    })
  }

  function onExist() {
    void runAction('exist', async () => {
      const next = requireWord()
      const body = await requestJson(
        apiUrl(base, `voc/exist/${encodeURIComponent(next)}`).toString(),
        'Authentication',
        password,
      )
      const exists = isRecord(body) && body.data === true
      return exists ? `「${next}」在词库中` : `「${next}」不在词库中`
    })
  }

  function onDetail() {
    void runAction('detail', async () => {
      const next = requireWord()
      const body = await requestJson(
        apiUrl(base, `voc/detail/${encodeURIComponent(next)}`).toString(),
        'Authentication',
        password,
      )
      if (!isRecord(body)) throw new Error('返回格式无法识别')
      const item = readWord(body.data)
      if (!item) throw new Error('返回格式无法识别')
      setWord(item.word)
      setPointsText(String(item.points))
      return `「${item.word}」 ${item.points} 分 · 添加 ${formatTime(item.addAt)} · 更新 ${formatTime(item.updateAt)}`
    })
  }

  function onDelete() {
    const next = word.trim()
    if (!next) {
      setNotice({ kind: 'error', text: '请填写单词' })
      return
    }
    if (!window.confirm(`删除「${next}」？`)) return
    void runAction('delete', async () => {
      await requestJson(wordUrl(base, next), 'Authentication', password, { method: 'DELETE' })
      return `已删除「${next}」`
    })
  }

  function onUpdatePoints() {
    void runAction('points', async () => {
      const next = requireWord()
      if (pointsText.trim() === '' || !Number.isInteger(Number(pointsText))) {
        throw new Error('points 需要是整数')
      }
      const points = Number(pointsText)
      const url = apiUrl(base, `voc/points/${encodeURIComponent(next)}`)
      url.searchParams.set('points', String(points))
      await requestJson(url.toString(), 'Authentication', password, { method: 'POST' })
      return `已把「${next}」的分数更新为 ${points}`
    })
  }

  function fillWord(item: VocWord) {
    setWord(item.word)
    setPointsText(String(item.points))
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>单词列表</h2>
        <form className="actions" onSubmit={onLowest}>
          <label className="field">
            count
            <input
              type="number"
              min={1}
              max={10000}
              step={1}
              value={countText}
              onChange={(event) => setCountText(event.target.value)}
              required
            />
          </label>
          <label className="field">
            points
            <input
              type="number"
              step={1}
              value={addPointsText}
              onChange={(event) => setAddPointsText(event.target.value)}
              required
            />
          </label>
          <button className="primary" type="submit" disabled={busy !== null}>
            {busy === 'lowest' ? '获取中…' : '分数最低'}
          </button>
          <button className="ghost" type="button" disabled={busy !== null} onClick={() => void loadList({ type: 'all' }, 'all')}>
            {busy === 'all' ? '获取中…' : '全部单词'}
          </button>
        </form>
        <p className="meta">
          <code>GET /voc</code>
          <code>GET /voc/all</code>
        </p>
        {listError ? (
          <p className="notice error" role="alert">
            {listError}
          </p>
        ) : null}
        {listMode && words.length === 0 && !listError ? <p className="meta">没有单词。</p> : null}
        {words.length > 0 ? (
          <>
            <p className="meta">共 {words.length} 个</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>单词</th>
                    <th>分数</th>
                    <th>添加时间</th>
                    <th>更新时间</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {words.map((item) => (
                    <tr key={item.word} className={item.word === word ? 'selected' : undefined}>
                      <td>{item.word}</td>
                      <td>{item.points}</td>
                      <td>{formatTime(item.addAt)}</td>
                      <td>{formatTime(item.updateAt)}</td>
                      <td>
                        <button className="ghost" type="button" onClick={() => fillWord(item)}>
                          填入
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel">
        <h2>单词操作</h2>
        <form className="actions" onSubmit={onAdd}>
          <label className="field grow">
            word
            <input
              value={word}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setWord(event.target.value)}
              required
            />
          </label>
          <button className="primary" type="submit" disabled={busy !== null}>
            {busy === 'add' ? '添加中…' : '添加'}
          </button>
          <button className="ghost" type="button" disabled={busy !== null} onClick={onExist}>
            {busy === 'exist' ? '查询中…' : '是否存在'}
          </button>
          <button className="ghost" type="button" disabled={busy !== null} onClick={onDetail}>
            {busy === 'detail' ? '查询中…' : '详情'}
          </button>
          <button className="danger" type="button" disabled={busy !== null} onClick={onDelete}>
            {busy === 'delete' ? '删除中…' : '删除'}
          </button>
        </form>
        <form
          className="actions"
          onSubmit={(event) => {
            event.preventDefault()
            onUpdatePoints()
          }}
        >
          <label className="field">
            points
            <input
              type="number"
              step={1}
              value={pointsText}
              onChange={(event) => setPointsText(event.target.value)}
            />
          </label>
          <button className="ghost" type="submit" disabled={busy !== null}>
            {busy === 'points' ? '更新中…' : '更新分数'}
          </button>
        </form>
        <p className="meta">
          <code>POST /voc/&#123;word&#125;</code>
          <code>GET /voc/exist/&#123;word&#125;</code>
          <code>GET /voc/detail/&#123;word&#125;</code>
          <code>DELETE /voc/&#123;word&#125;</code>
          <code>POST /voc/points/&#123;word&#125;</code>
        </p>
        {notice ? (
          <p className={notice.kind === 'error' ? 'notice error' : 'notice'} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        ) : null}
      </section>
    </div>
  )
}

export function VocPage() {
  return (
    <ServiceFrame
      service="voc"
      title="词汇"
      placeholder="https://voc-api.fastapicloud.dev/"
      verify={async ({ prefix, password }) => {
        await requestOk(apiUrl(prefix, 'auth').toString(), 'Authentication', password)
      }}
    >
      {({ prefix, password }) => <VocConsole password={password} base={prefix} />}
    </ServiceFrame>
  )
}
