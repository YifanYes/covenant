import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import './App.css'
import reactLogo from './assets/react.svg'
import { trpc } from './utils/trpc'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

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
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
      <p>{data.greeting}</p>
    </>
  )
}

export default App
