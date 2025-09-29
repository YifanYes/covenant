import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './layouts/AppLayout'
import CenteredLayout from './layouts/CenteredLayout'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Calendar from './views/Calendar'
import Dashboard from './views/Dashboard'
import ForgotPassword from './views/ForgotPassword'
import Habits from './views/Habits'
import Login from './views/Login'
import Objectives from './views/Objectives'
import Profile from './views/Profile'
import RecoverPassword from './views/RecoverPassword'
import Settings from './views/Settings'
import SignUp from './views/SignUp'
import Tasks from './views/Tasks'

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
              <Route
                path='/dashboard'
                element={
                  <Suspense fallback={<div>Loading dashboard…</div>}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path='/objectives'
                element={
                  <Suspense fallback={<div>Loading objectives…</div>}>
                    <Objectives />
                  </Suspense>
                }
              />
              <Route
                path='/calendar'
                element={
                  <Suspense fallback={<div>Loading calendar…</div>}>
                    <Calendar />
                  </Suspense>
                }
              />
              <Route path='/tasks' element={<Tasks />} />
              <Route path='/habits' element={<Habits />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='/settings' element={<Settings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
