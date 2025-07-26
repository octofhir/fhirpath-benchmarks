import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const LandingPage = lazy(() => import('@pages/landing'))
const DashboardPage = lazy(() => import('@pages/dashboard'))
const BenchmarkDetailPage = lazy(() => import('@pages/benchmark-detail'))
const TestExplorerPage = lazy(() => import('@pages/test-explorer'))

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/benchmarks/:implementation',
    element: <BenchmarkDetailPage />,
  },
  {
    path: '/tests',
    element: <TestExplorerPage />,
  },
]
