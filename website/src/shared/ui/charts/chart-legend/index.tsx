import { Checkbox, ColorSwatch, Group, Paper, Text } from '@mantine/core'

export interface LegendItem {
  id: string
  label: string
  color: string
  visible: boolean
}

interface ChartLegendProps {
  items: LegendItem[]
  onToggle: (id: string, visible: boolean) => void
  orientation?: 'horizontal' | 'vertical'
  compact?: boolean
}

export function ChartLegend({
  items,
  onToggle,
  orientation = 'horizontal',
  compact = false,
}: ChartLegendProps) {
  const handleToggle = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item) {
      onToggle(id, !item.visible)
    }
  }

  const isHorizontal = orientation === 'horizontal'

  return (
    <Paper p={compact ? 'xs' : 'sm'} withBorder>
      <Group
        gap={compact ? 'xs' : 'sm'}
        justify={isHorizontal ? 'center' : 'flex-start'}
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          flexWrap: isHorizontal ? 'wrap' : 'nowrap',
        }}
      >
        {items.map((item) => (
          <Group
            key={item.id}
            gap="xs"
            style={{
              cursor: 'pointer',
              opacity: item.visible ? 1 : 0.6,
              transition: 'opacity 200ms ease',
            }}
            onClick={() => handleToggle(item.id)}
          >
            <Checkbox
              checked={item.visible}
              onChange={() => handleToggle(item.id)}
              size={compact ? 'xs' : 'sm'}
              styles={{
                input: { cursor: 'pointer' },
              }}
            />
            <ColorSwatch
              color={item.color}
              size={compact ? 14 : 16}
              style={{ cursor: 'pointer' }}
            />
            <Text size={compact ? 'xs' : 'sm'} style={{ cursor: 'pointer', userSelect: 'none' }}>
              {item.label}
            </Text>
          </Group>
        ))}
      </Group>
    </Paper>
  )
}
