export function HomePage() {
  return (
    <main className="home">
      <nav className="home-nav" aria-label="服务">
        <a href="#/edge-tts">
          <strong>Edge TTS</strong>
          <span>语音列表与文字转语音</span>
        </a>
        <a href="#/voc">
          <strong>词汇</strong>
          <span>单词的添加、查询、改分和删除</span>
        </a>
      </nav>
    </main>
  )
}
