import { AreaChart, BarChart, LineChart } from '@mantine/charts'
import { Badge, Grid, Group, Select, Stack, Text } from '@mantine/core'
import type { ImplementationMetadata } from '@shared/lib'
import { formatExecutionTime, formatPercentage, generateColorPalette } from '@shared/lib'
import { ChartContainer, ResponsiveChart } from '@shared/ui'
import { useState } from 'react'

interface AdvancedPerformanceDashboardProps {
  implementations: ImplementationMetadata[]
  historicalData?: Array<{
    timestamp: number
    [implementation: string]: any
  }>
  memoryData?: Array<{
    implementation: string
    avgMemory: number
    peakMemory: number
    allocations: number
  }>
}

export function AdvancedPerformanceDashboard({
  implementations,
}: AdvancedPerformanceDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('execution_time')
  const [timeRange, setTimeRange] = useState<string>('7d')

  // Transform data for different chart types
  const executionTimeData = implementations.map((impl) => ({
    implementation: impl.name,
    avgTime: impl.avg_execution_time,
    minTime: impl.avg_execution_time * 0.8, // Mock min time
    maxTime: impl.avg_execution_time * 1.3, // Mock max time
    p95Time: impl.avg_execution_time * 1.15, // Mock p95
  }))

  const throughputData = implementations.map((impl) => ({
    implementation: impl.name,
    testsPerSecond: impl.total_tests / (impl.avg_execution_time / 1000),
    efficiency: (impl.pass_rate / 100) * (impl.total_tests / (impl.avg_execution_time / 1000)),
  }))

  // Mock memory vs execution time correlation data
  const correlationData = implementations.map((impl, index) => ({
    implementation: impl.name,
    executionTime: impl.avg_execution_time,
    memoryUsage: 50 + index * 15 + Math.random() * 20, // Mock memory data
    passRate: impl.pass_rate,
    color: generateColorPalette(implementations.length)[index],
  }))

  // Efficiency metrics combining multiple factors
  const efficiencyData = implementations.map((impl) => {
    const speed = Math.max(0, 100 - impl.avg_execution_time / 10)
    const accuracy = impl.pass_rate
    const stability = Math.max(0, 100 - (impl.error_count / impl.total_tests) * 100)
    const overall = (speed + accuracy + stability) / 3

    return {
      implementation: impl.name,
      speed,
      accuracy,
      stability,
      overall,
    }
  })

  // Performance trend analysis (mock data)
  const trendData = [
    {
      date: '2024-01-01',
      ...Object.fromEntries(
        implementations.map((impl) => [
          impl.name,
          impl.avg_execution_time * (0.9 + Math.random() * 0.2),
        ]),
      ),
    },
    {
      date: '2024-01-08',
      ...Object.fromEntries(
        implementations.map((impl) => [
          impl.name,
          impl.avg_execution_time * (0.95 + Math.random() * 0.1),
        ]),
      ),
    },
    {
      date: '2024-01-15',
      ...Object.fromEntries(
        implementations.map((impl) => [
          impl.name,
          impl.avg_execution_time * (0.92 + Math.random() * 0.16),
        ]),
      ),
    },
    {
      date: '2024-01-22',
      ...Object.fromEntries(implementations.map((impl) => [impl.name, impl.avg_execution_time])),
    },
  ]

  const colors = generateColorPalette(implementations.length)

  return (
    <Stack gap="lg">
      {/* Controls */}
      <Group>
        <Select
          label="Metric"
          value={selectedMetric}
          onChange={(value) => setSelectedMetric(value || 'execution_time')}
          data={[
            { value: 'execution_time', label: 'Execution Time' },
            { value: 'throughput', label: 'Throughput' },
            { value: 'memory', label: 'Memory Usage' },
            { value: 'efficiency', label: 'Efficiency Score' },
          ]}
        />
        <Select
          label="Time Range"
          value={timeRange}
          onChange={(value) => setTimeRange(value || '7d')}
          data={[
            { value: '24h', label: 'Last 24 Hours' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
          ]}
        />
      </Group>

      <Grid>
        {/* Multi-implementation execution time comparison with error bars */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Execution Time Distribution"
            badge={{ label: 'Performance Range', color: 'blue' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={executionTimeData}
                dataKey="implementation"
                series={[
                  { name: 'avgTime', color: 'blue.6', label: 'Average Time' },
                  { name: 'p95Time', color: 'orange.6', label: '95th Percentile' },
                ]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Throughput comparison */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Throughput Analysis"
            badge={{ label: 'Tests/Second', color: 'green' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={throughputData}
                dataKey="implementation"
                series={[
                  { name: 'testsPerSecond', color: 'green.6', label: 'Tests/sec' },
                  { name: 'efficiency', color: 'teal.6', label: 'Efficiency Score' },
                ]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Memory vs Execution Time Correlation */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Memory vs Execution Time"
            badge={{ label: 'Resource Correlation', color: 'purple' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={correlationData}
                dataKey="implementation"
                series={[
                  { name: 'executionTime', color: 'blue.6', label: 'Execution Time (ms)' },
                  { name: 'memoryUsage', color: 'orange.6', label: 'Memory Usage (MB)' },
                ]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Efficiency Radar-style Comparison */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Multi-dimensional Efficiency"
            badge={{ label: 'Speed • Accuracy • Stability', color: 'violet' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={efficiencyData}
                dataKey="implementation"
                series={[
                  { name: 'speed', color: 'red.6', label: 'Speed Score' },
                  { name: 'accuracy', color: 'green.6', label: 'Accuracy Score' },
                  { name: 'stability', color: 'blue.6', label: 'Stability Score' },
                ]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Performance Trend Analysis */}
        <Grid.Col span={12}>
          <ChartContainer
            title="Performance Trends Over Time"
            badge={{ label: 'Historical Analysis', color: 'cyan' }}
          >
            <ResponsiveChart desktopHeight={400}>
              <LineChart
                h={400}
                data={trendData}
                dataKey="date"
                series={implementations.map((impl, index) => ({
                  name: impl.name,
                  color: colors[index],
                  label: impl.name,
                }))}
                connectNulls={false}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
                curveType="monotone"
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Resource Utilization Efficiency */}
        <Grid.Col span={12}>
          <ChartContainer
            title="Resource Utilization Efficiency"
            badge={{ label: 'CPU • Memory • I/O', color: 'orange' }}
          >
            <ResponsiveChart desktopHeight={350}>
              <AreaChart
                h={350}
                data={implementations.map((impl) => ({
                  implementation: impl.name,
                  cpu: 60 + Math.random() * 30, // Mock CPU usage
                  memory: 40 + Math.random() * 40, // Mock memory usage
                  io: 20 + Math.random() * 30, // Mock I/O usage
                }))}
                dataKey="implementation"
                series={[
                  { name: 'cpu', color: 'red.6', label: 'CPU Usage (%)' },
                  { name: 'memory', color: 'blue.6', label: 'Memory Usage (%)' },
                  { name: 'io', color: 'green.6', label: 'I/O Usage (%)' },
                ]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
                fillOpacity={0.6}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>
      </Grid>

      {/* Performance Summary Stats */}
      <Grid>
        {implementations.map((impl) => {
          return (
            <Grid.Col key={impl.name} span={{ base: 12, sm: 6, lg: 3 }}>
              <ChartContainer
                title={impl.name}
                badge={{
                  label: `${formatPercentage(impl.pass_rate)} Pass Rate`,
                  color: impl.pass_rate > 90 ? 'green' : impl.pass_rate > 75 ? 'yellow' : 'red',
                }}
                withBorder
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Avg Time:
                    </Text>
                    <Text size="sm" fw={500}>
                      {formatExecutionTime(impl.avg_execution_time)}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Tests:
                    </Text>
                    <Text size="sm" fw={500}>
                      {impl.total_tests}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Errors:
                    </Text>
                    <Badge size="sm" color={impl.error_count === 0 ? 'green' : 'red'}>
                      {impl.error_count}
                    </Badge>
                  </Group>
                </Stack>
              </ChartContainer>
            </Grid.Col>
          )
        })}
      </Grid>
    </Stack>
  )
}
