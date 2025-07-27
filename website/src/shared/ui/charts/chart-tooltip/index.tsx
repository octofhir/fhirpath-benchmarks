import { ColorSwatch, Divider, Group, Paper, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

export interface TooltipData {
  label: string
  value: string | number
  color?: string
  unit?: string
  formatted?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  title?: string
  customContent?: ReactNode
  formatValue?: (value: any, key: string) => string
  showColorIndicator?: boolean
}

export function ChartTooltip({
  active,
  payload,
  label,
  title,
  customContent,
  formatValue,
  showColorIndicator = true,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  if (customContent) {
    return (
      <Paper withBorder p="sm" shadow="sm" bg="var(--mantine-color-body)">
        {customContent}
      </Paper>
    )
  }

  return (
    <Paper withBorder p="sm" shadow="sm" bg="var(--mantine-color-body)" maw={300}>
      {(title || label) && (
        <>
          <Text fw={600} size="sm">
            {title || label}
          </Text>
          <Divider my="xs" />
        </>
      )}

      <Stack gap="xs">
        {payload.map((entry, index) => {
          const value = formatValue ? formatValue(entry.value, entry.dataKey) : entry.value

          return (
            <Group key={index} gap="xs" justify="space-between">
              <Group gap="xs">
                {showColorIndicator && entry.color && <ColorSwatch color={entry.color} size={12} />}
                <Text size="xs" c="dimmed">
                  {entry.name || entry.dataKey}:
                </Text>
              </Group>
              <Text size="xs" fw={500}>
                {value}
              </Text>
            </Group>
          )
        })}
      </Stack>
    </Paper>
  )
}

// Helper function to create formatted tooltip content
export function formatTooltipValue(
  value: any,
  type: 'number' | 'percentage' | 'time' | 'bytes' = 'number',
  precision = 2,
): string {
  if (value === null || value === undefined) return 'N/A'

  switch (type) {
    case 'percentage':
      return `${Number(value).toFixed(precision)}%`
    case 'time':
      if (value < 1000) return `${Number(value).toFixed(precision)}ms`
      return `${(Number(value) / 1000).toFixed(precision)}s`
    case 'bytes': {
      const sizes = ['B', 'KB', 'MB', 'GB']
      if (value === 0) return '0 B'
      const i = Math.floor(Math.log(value) / Math.log(1024))
      return `${(value / 1024 ** i).toFixed(precision)} ${sizes[i]}`
    }
    default:
      return Number(value).toLocaleString(undefined, {
        maximumFractionDigits: precision,
      })
  }
}
