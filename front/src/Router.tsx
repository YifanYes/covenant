import { BrowserRouter, Route, Routes } from 'react-router'
import PrivateRoute from './components/PrivateRoute'
import CenteredLayout from './layouts/CenteredLayout'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Dashboard from './views/Dashboard'
import Login from './views/Login'
import SignUp from './views/SignUp'

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CenteredLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
        </Route>
        <Route element={<PrivateRoute />}>
          <Route element={<WorkspaceLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
