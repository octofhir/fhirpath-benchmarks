import { useMantineTheme } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import type { ReactNode } from 'react'

interface ResponsiveChartProps {
  children: ReactNode
  mobileHeight?: number
  desktopHeight?: number
  className?: string
}

export function ResponsiveChart({
  children,
  mobileHeight = 250,
  desktopHeight = 300,
  className,
}: ResponsiveChartProps) {
  const theme = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`)

  const height = isMobile ? mobileHeight : desktopHeight

  return (
    <div
      className={className}
      style={{
        height,
        width: '100%',
        minHeight: 200,
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}
