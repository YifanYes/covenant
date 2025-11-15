import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import PrivateRoute from './components/PrivateRoute'
import TasksSuspenseFallback from './components/suspense-fallbacks/TasksSuspenseFallback'
import AppLayout from './layouts/AppLayout'
import CenteredLayout from './layouts/CenteredLayout'
import WorkspaceLayout from './layouts/WorkspaceLayout'

// Lazy load views
const Calendar = lazy(() => import('./views/Calendar'))
const Dashboard = lazy(() => import('./views/Dashboard'))
const ForgotPassword = lazy(() => import('./views/ForgotPassword'))
const Habits = lazy(() => import('./views/Habits'))
const Login = lazy(() => import('./views/Login'))
const Objectives = lazy(() => import('./views/Objectives'))
const Profile = lazy(() => import('./views/Profile'))
const RecoverPassword = lazy(() => import('./views/RecoverPassword'))
const Settings = lazy(() => import('./views/Settings'))
const SignUp = lazy(() => import('./views/SignUp'))
const Tasks = lazy(() => import('./views/Tasks'))

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<CenteredLayout />}>
            <Route
              path='/login'
              element={
                <Suspense fallback={<div>Loading…</div>}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path='/sign-up'
              element={
                <Suspense fallback={<div>Loading…</div>}>
                  <SignUp />
                </Suspense>
              }
            />
            <Route
              path='/forgot-password'
              element={
                <Suspense fallback={<div>Loading…</div>}>
                  <ForgotPassword />
                </Suspense>
              }
            />
            <Route
              path='/recover-password'
              element={
                <Suspense fallback={<div>Loading…</div>}>
                  <RecoverPassword />
                </Suspense>
              }
            />
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
              <Route
                path='/tasks'
                element={
                  <Suspense fallback={<TasksSuspenseFallback />}>
                    <Tasks />
                  </Suspense>
                }
              />
              <Route
                path='/habits'
                element={
                  <Suspense fallback={<div>Loading habits…</div>}>
                    <Habits />
                  </Suspense>
                }
              />
              <Route
                path='/profile'
                element={
                  <Suspense fallback={<div>Loading profile…</div>}>
                    <Profile />
                  </Suspense>
                }
              />
              <Route
                path='/settings'
                element={
                  <Suspense fallback={<div>Loading settings…</div>}>
                    <Settings />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
