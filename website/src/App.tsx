import { RouterProvider, ThemeProvider } from '@app/providers'

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider />
    </ThemeProvider>
  )
}
