import { BrowserRouter, Route, Routes } from 'react-router'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './layouts/AppLayout'
import CenteredLayout from './layouts/CenteredLayout'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Dashboard from './views/Dashboard'
import ForgotPassword from './views/ForgotPassword'
import Login from './views/Login'
import RecoverPassword from './views/RecoverPassword'
import SignUp from './views/SignUp'

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<CenteredLayout />}>
            <Route path='/login' element={<Login />} />
            <Route path='/sign-up' element={<SignUp />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/recover-password' element={<RecoverPassword />} />
          </Route>
          <Route element={<PrivateRoute />}>
            <Route element={<WorkspaceLayout />}>
              <Route path='/dashboard' element={<Dashboard />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
