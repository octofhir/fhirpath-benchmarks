import { Alert, Badge, Card, Group, LoadingOverlay, Title } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface ChartContainerProps {
  children: ReactNode
  title: string
  loading?: boolean
  error?: string | null
  badge?: {
    label: string
    color: string
  }
  withBorder?: boolean
  className?: string
}

export function ChartContainer({
  children,
  title,
  loading = false,
  error = null,
  badge,
  withBorder = true,
  className,
}: ChartContainerProps) {
  return (
    <Card withBorder={withBorder} className={className}>
      <Card.Section withBorder inheritPadding py="md">
        <Group justify="space-between">
          <Title order={4}>{title}</Title>
          {badge && (
            <Badge variant="light" color={badge.color}>
              {badge.label}
            </Badge>
          )}
        </Group>
      </Card.Section>

      <Card.Section p="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error ? (
          <Alert
            variant="light"
            color="red"
            icon={<IconAlertCircle size={16} />}
            title="Chart Error"
          >
            {error}
          </Alert>
        ) : (
          children
        )}
      </Card.Section>
    </Card>
  )
}
