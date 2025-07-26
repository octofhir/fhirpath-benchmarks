import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const DashboardPage = lazy(() => import('@pages/dashboard'))
const BenchmarkDetailPage = lazy(() => import('@pages/benchmark-detail'))
const TestExplorerPage = lazy(() => import('@pages/test-explorer'))
const ImplementationsPage = lazy(() => import('@pages/implementations'))
const NotFoundPage = lazy(() => import('@pages/not-found'))

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <DashboardPage />,
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
  {
    path: '/implementations',
    element: <ImplementationsPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]
