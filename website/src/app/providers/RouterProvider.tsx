import { Box, Center, Loader } from '@mantine/core'
import { ErrorBoundary } from '@shared/ui/error-boundary'
import { NavigationHeader } from '@widgets/navigation-header'
import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { routes } from '../router'

function LoadingFallback() {
  return (
    <Center h="100vh">
      <Loader size="lg" />
    </Center>
  )
}

export function RouterProvider() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <Box>
          <NavigationHeader />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {routes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </Suspense>
        </Box>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
