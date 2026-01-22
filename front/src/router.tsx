import PrivateRoute from '@/auth/private-route.component'
import AdventureSuspenseFallback from '@/components/suspense-fallbacks/adventure-suspense-fallback.component'
import DashboardSuspenseFallback from '@/components/suspense-fallbacks/dashboard-suspense-fallback.component'
import HabitsSuspenseFallback from '@/components/suspense-fallbacks/habits-suspense-fallback.component'
import LoginSuspenseFallback from '@/components/suspense-fallbacks/login-suspense-fallback.component'
import ObjectivesSuspenseFallback from '@/components/suspense-fallbacks/objectives-suspense-fallback.component'
import SettingsSuspenseFallback from '@/components/suspense-fallbacks/settings-suspense-fallback.component'
import SignUpSuspenseFallback from '@/components/suspense-fallbacks/sign-up-suspense-fallback.component'
import TasksSuspenseFallback from '@/components/suspense-fallbacks/tasks-suspense-fallback.component'
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
const Inventory = lazy(() => import('./views/inventory/inventory.page'))
const Store = lazy(() => import('./views/store/store.page'))
const WorldMap = lazy(() => import('./views/map/world-map.page'))
const ActivityDetail = lazy(() => import('./views/map/activity-detail.page'))
const Investments = lazy(() => import('./views/investments/investments.page'))

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
              <Route
                path='/inventory'
                element={
                  <Suspense fallback={<AdventureSuspenseFallback />}>
                    <Inventory />
                  </Suspense>
                }
              />
              <Route
                path='/shop'
                element={
                  <Suspense fallback={<AdventureSuspenseFallback />}>
                    <Store />
                  </Suspense>
                }
              />
              <Route
                path='/map'
                element={
                  <Suspense fallback={<AdventureSuspenseFallback />}>
                    <WorldMap />
                  </Suspense>
                }
              />
              <Route
                path='/map/activity/:id'
                element={
                  <Suspense fallback={<AdventureSuspenseFallback />}>
                    <ActivityDetail />
                  </Suspense>
                }
              />
              <Route
                path='/investments'
                element={
                  <Suspense fallback={<AdventureSuspenseFallback />}>
                    <Investments />
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
