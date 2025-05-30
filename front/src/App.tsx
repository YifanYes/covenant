import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import './App.css'
import reactLogo from './assets/react.svg'
import { trpc } from './utils/trpc'
import viteLogo from '/vite.svg'

function App() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useQuery(trpc.greet.queryOptions({ name: 'world' }))

  if (isLoading || !data) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => i18n.changeLanguage('en')}>English</button>
        <button onClick={() => i18n.changeLanguage('es')}>Español</button>
      </div>
      <p>Data from server: {data.greeting}</p>
      <p>Translation key: {t('hello')}</p>
    </>
  )
}

export default App
