import { BrowserRouter, Route, Routes } from 'react-router'
import CenteredLayout from './layouts/CenteredLayout'
import Login from './views/Login'

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CenteredLayout />}>
          <Route path="/" element={<Login />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
