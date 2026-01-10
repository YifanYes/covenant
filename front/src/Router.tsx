import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import PrivateRoute from './components/PrivateRoute'
import AdventureSuspenseFallback from './components/suspense-fallbacks/AdventureSuspenseFallback'
import DashboardSuspenseFallback from './components/suspense-fallbacks/DashboardSuspenseFallback'
import HabitsSuspenseFallback from './components/suspense-fallbacks/HabitsSuspenseFallback'
import LoginSuspenseFallback from './components/suspense-fallbacks/LoginSuspenseFallback'
import ObjectivesSuspenseFallback from './components/suspense-fallbacks/ObjectivesSuspenseFallback'
import SettingsSuspenseFallback from './components/suspense-fallbacks/SettingsSuspenseFallback'
import SignUpSuspenseFallback from './components/suspense-fallbacks/SignUpSuspenseFallback'
import TasksSuspenseFallback from './components/suspense-fallbacks/TasksSuspenseFallback'
import AdventureLayout from './layouts/AdventureLayout'
import AppLayout from './layouts/AppLayout'
import CenteredLayout from './layouts/CenteredLayout'
import WorkspaceLayout from './layouts/WorkspaceLayout'

// Lazy load views
const Dashboard = lazy(() => import('./views/Dashboard'))
const Habits = lazy(() => import('./views/Habits'))
const Login = lazy(() => import('./views/Login'))
const Objectives = lazy(() => import('./views/Objectives'))
const Onboarding = lazy(() => import('./views/Onboarding'))
const Settings = lazy(() => import('./views/Settings'))
const SignUp = lazy(() => import('./views/SignUp'))
const Tasks = lazy(() => import('./views/Tasks'))
const AdventureInventory = lazy(() => import('./views/AdventureInventory'))
const AdventureMissions = lazy(() => import('./views/AdventureMissions'))
const MissionDetail = lazy(() => import('./views/MissionDetail'))

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<CenteredLayout />}>
            <Route path='/' element={<Navigate to='/login' replace />} />
            <Route
              path='/login'
              element={
                <Suspense fallback={<LoginSuspenseFallback />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path='/sign-up'
              element={
                <Suspense fallback={<SignUpSuspenseFallback />}>
                  <SignUp />
                </Suspense>
              }
            />
          </Route>
          <Route element={<PrivateRoute />}>
            <Route
              path='/onboarding'
              element={
                <Suspense fallback={<LoginSuspenseFallback />}>
                  <Onboarding />
                </Suspense>
              }
            />
            <Route element={<WorkspaceLayout />}>
              <Route
                path='/dashboard'
                element={
                  <Suspense fallback={<DashboardSuspenseFallback />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path='/objectives'
                element={
                  <Suspense fallback={<ObjectivesSuspenseFallback />}>
                    <Objectives />
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
                  <Suspense fallback={<HabitsSuspenseFallback />}>
                    <Habits />
                  </Suspense>
                }
              />
              <Route
                path='/settings'
                element={
                  <Suspense fallback={<SettingsSuspenseFallback />}>
                    <Settings />
                  </Suspense>
                }
              />
              <Route path='/adventure' element={<AdventureLayout />}>
                <Route index element={<Navigate to='inventory' replace />} />
                <Route
                  path='inventory'
                  element={
                    <Suspense fallback={<AdventureSuspenseFallback />}>
                      <AdventureInventory />
                    </Suspense>
                  }
                />
                <Route
                  path='missions'
                  element={
                    <Suspense fallback={<AdventureSuspenseFallback />}>
                      <AdventureMissions />
                    </Suspense>
                  }
                />
              </Route>
              <Route
                path='/adventure/missions/:missionId'
                element={
                  <Suspense fallback={<AdventureSuspenseFallback />}>
                    <MissionDetail />
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
