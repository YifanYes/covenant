import PrivateRoute from '@/auth/private-route.component'
import AdventureSuspenseFallback from '@/components/suspense-fallbacks/adventure-suspense-fallback.component'
import DashboardSuspenseFallback from '@/components/suspense-fallbacks/dashboard-suspense-fallback.component'
import HabitsSuspenseFallback from '@/components/suspense-fallbacks/habits-suspense-fallback.component'
import LoginSuspenseFallback from '@/components/suspense-fallbacks/login-suspense-fallback.component'
import ObjectivesSuspenseFallback from '@/components/suspense-fallbacks/objectives-suspense-fallback.component'
import SettingsSuspenseFallback from '@/components/suspense-fallbacks/settings-suspense-fallback.component'
import SignUpSuspenseFallback from '@/components/suspense-fallbacks/sign-up-suspense-fallback.component'
import TasksSuspenseFallback from '@/components/suspense-fallbacks/tasks-suspense-fallback.component'
import AdventureLayout from '@/layouts/adventure-layout'
import AppLayout from '@/layouts/app-layout'
import CenteredLayout from '@/layouts/centered-layout'
import WorkspaceLayout from '@/layouts/workspace-layout'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

// Lazy load views
const Dashboard = lazy(() => import('./views/dashboard/dashboard.page'))
const Habits = lazy(() => import('./views/habits/habits.page'))
const Login = lazy(() => import('./views/auth/login/login.page'))
const Objectives = lazy(() => import('./views/objectives/objectives.page'))
const Onboarding = lazy(() => import('./views/auth/onboarding/onboarding.page'))
const Settings = lazy(() => import('./views/settings/settings.page'))
const SignUp = lazy(() => import('./views/auth/sign-up/sign-up.page'))
const Tasks = lazy(() => import('./views/tasks/tasks.page'))
const AdventureInventory = lazy(() => import('./views/adventure/adventure-inventory/adventure-inventory.page'))
const AdventureMissions = lazy(() => import('./views/adventure/adventure-missions/adventure-missions.page'))
const AdventureHistory = lazy(() => import('./views/adventure/adventure-history/adventure-history.page'))
const AdventureStore = lazy(() => import('./views/adventure/adventure-store/adventure-store.page'))
const MissionDetail = lazy(() => import('./views/adventure/mission-detail/mission-detail.page'))

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
