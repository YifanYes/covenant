import { PrivateRoute } from '@/auth'
import {
  AdventureSuspenseFallback,
  DashboardSuspenseFallback,
  HabitsSuspenseFallback,
  LoginSuspenseFallback,
  ObjectivesSuspenseFallback,
  SettingsSuspenseFallback,
  SignUpSuspenseFallback,
  TasksSuspenseFallback
} from '@/components/suspense-fallbacks'
import { AdventureLayout, AppLayout, CenteredLayout, WorkspaceLayout } from '@/layouts'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

// Lazy load views
const Dashboard = lazy(() => import('./views/productivity/dashboard.page'))
const Habits = lazy(() => import('./views/productivity/habits.page'))
const Login = lazy(() => import('./views/auth/login.page'))
const Objectives = lazy(() => import('./views/productivity/objectives.page'))
const Onboarding = lazy(() => import('./views/auth/onboarding.page'))
const Settings = lazy(() => import('./views/productivity/settings.page'))
const SignUp = lazy(() => import('./views/auth/sign-up.page'))
const Tasks = lazy(() => import('./views/productivity/tasks.page'))
const AdventureInventory = lazy(() => import('./views/adventure/adventure-inventory.page'))
const AdventureMissions = lazy(() => import('./views/adventure/adventure-missions.page'))
const AdventureHistory = lazy(() => import('./views/adventure/adventure-history.page'))
const AdventureStore = lazy(() => import('./views/adventure/adventure-store.page'))
const MissionDetail = lazy(() => import('./views/adventure/mission-detail.page'))

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
                <Route
                  path='history'
                  element={
                    <Suspense fallback={<AdventureSuspenseFallback />}>
                      <AdventureHistory />
                    </Suspense>
                  }
                />
                <Route
                  path='store'
                  element={
                    <Suspense fallback={<AdventureSuspenseFallback />}>
                      <AdventureStore />
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
