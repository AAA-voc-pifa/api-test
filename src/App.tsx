import { useEffect, useState } from 'react'
import { EdgeTtsPage } from './pages/EdgeTtsPage'
import { HomePage } from './pages/HomePage'
import { VocPage } from './pages/VocPage'

type Route = 'home' | 'edge-tts' | 'voc'

function readRoute(): Route {
  const path = (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
  if (path === '/edge-tts') return 'edge-tts'
  if (path === '/voc') return 'voc'
  return 'home'
}

function titleFor(route: Route): string {
  if (route === 'edge-tts') return 'Edge TTS'
  if (route === 'voc') return '词汇'
  return 'API'
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  useEffect(() => {
    document.title = titleFor(route)
  }, [route])

  if (route === 'edge-tts') return <EdgeTtsPage />
  if (route === 'voc') return <VocPage />
  return <HomePage />
}
