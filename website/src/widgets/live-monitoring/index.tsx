import { AreaChart, LineChart } from '@mantine/charts'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Progress,
  RingProgress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Timeline,
  Title,
} from '@mantine/core'
import type { ImplementationMetadata } from '@shared/lib'
import {
  IconActivity,
  IconAlertTriangle,
  IconBell,
  IconBellOff,
  IconCheck,
  IconClock,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconSettings,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

interface LiveMonitoringProps {
  implementations: ImplementationMetadata[]
  onStartBenchmark?: () => void
  onStopBenchmark?: () => void
}

interface LiveMetrics {
  timestamp: number
  totalTests: number
  completedTests: number
  passedTests: number
  failedTests: number
  avgExecutionTime: number
  memoryUsage: number
  cpuUsage: number
  queuedTests: number
}

interface BenchmarkEvent {
  id: string
  timestamp: number
  type:
    | 'test_started'
    | 'test_completed'
    | 'test_failed'
    | 'benchmark_started'
    | 'benchmark_completed'
    | 'error'
  testName?: string
  implementation?: string
  executionTime?: number
  error?: string
  message: string
}

interface ResourceMetrics {
  timestamp: number
  cpuUsage: number
  memoryUsage: number
  networkActivity: number
  diskIO: number
}

export function LiveMonitoring({
  implementations,
  onStartBenchmark,
  onStopBenchmark,
}: LiveMonitoringProps) {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5)
  const [notifications, setNotifications] = useState(true)
  const [selectedImplementation, setSelectedImplementation] = useState<string>('all')

  // Simulated live data - in real implementation, this would come from WebSocket
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics[]>([])
  const [recentEvents, setRecentEvents] = useState<BenchmarkEvent[]>([])
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics[]>([])
  const [currentBenchmarkStatus, setCurrentBenchmarkStatus] = useState<
    'idle' | 'running' | 'completed' | 'error'
  >('idle')

  // Simulate live data updates
  useEffect(() => {
    if (!isMonitoring || !autoRefresh) return

    const interval = setInterval(() => {
      const now = Date.now()

      // Generate new metrics
      const newMetric: LiveMetrics = {
        timestamp: now,
        totalTests: 150 + Math.floor(Math.random() * 10),
        completedTests: Math.min(
          150,
          (liveMetrics[liveMetrics.length - 1]?.completedTests || 0) +
            Math.floor(Math.random() * 5),
        ),
        passedTests: Math.floor(Math.random() * 120) + 100,
        failedTests: Math.floor(Math.random() * 30) + 10,
        avgExecutionTime: 15 + Math.random() * 20,
        memoryUsage: 50 + Math.random() * 30,
        cpuUsage: 20 + Math.random() * 40,
        queuedTests: Math.max(0, 150 - (liveMetrics[liveMetrics.length - 1]?.completedTests || 0)),
      }

      setLiveMetrics((prev) => [...prev.slice(-29), newMetric])

      // Generate resource metrics
      const newResource: ResourceMetrics = {
        timestamp: now,
        cpuUsage: 20 + Math.random() * 60,
        memoryUsage: 40 + Math.random() * 40,
        networkActivity: Math.random() * 100,
        diskIO: Math.random() * 80,
      }

      setResourceMetrics((prev) => [...prev.slice(-29), newResource])

      // Occasionally generate events
      if (Math.random() < 0.3) {
        const eventTypes = ['test_completed', 'test_started', 'test_failed'] as const
        const event: BenchmarkEvent = {
          id: `${now}-${Math.random()}`,
          timestamp: now,
          type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          testName: `test${Math.floor(Math.random() * 100)}`,
          implementation:
            implementations[Math.floor(Math.random() * implementations.length)]?.language ||
            'unknown',
          executionTime: Math.random() * 50,
          message: `Test execution event at ${new Date(now).toLocaleTimeString()}`,
        }

        setRecentEvents((prev) => [event, ...prev.slice(0, 9)])
      }
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [isMonitoring, autoRefresh, refreshInterval, liveMetrics, implementations])

  // Current status derived from latest metrics
  const currentStatus = useMemo(() => {
    const latest = liveMetrics[liveMetrics.length - 1]
    if (!latest) return null

    const progress = (latest.completedTests / latest.totalTests) * 100
    const successRate =
      latest.completedTests > 0 ? (latest.passedTests / latest.completedTests) * 100 : 0

    return {
      progress,
      successRate,
      estimatedTimeRemaining:
        latest.queuedTests > 0 ? (latest.queuedTests * latest.avgExecutionTime) / 1000 : 0,
      currentThroughput:
        latest.completedTests > 0
          ? latest.completedTests / ((Date.now() - liveMetrics[0]?.timestamp) / 60000)
          : 0,
    }
  }, [liveMetrics])

  // Chart data for trends
  const chartData = useMemo(() => {
    return liveMetrics.map((metric, _index) => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      completedTests: metric.completedTests,
      avgExecutionTime: metric.avgExecutionTime,
      cpuUsage: metric.cpuUsage,
      memoryUsage: metric.memoryUsage,
      successRate:
        metric.completedTests > 0 ? (metric.passedTests / metric.completedTests) * 100 : 0,
    }))
  }, [liveMetrics])

  const handleStartMonitoring = () => {
    setIsMonitoring(true)
    setCurrentBenchmarkStatus('running')
    onStartBenchmark?.()
  }

  const handleStopMonitoring = () => {
    setIsMonitoring(false)
    setCurrentBenchmarkStatus('idle')
    onStopBenchmark?.()
  }

  const handleClearData = () => {
    setLiveMetrics([])
    setRecentEvents([])
    setResourceMetrics([])
  }

  return (
    <Stack gap="xl">
      {/* Header with controls */}
      <Group justify="space-between">
        <Title order={3}>Live Benchmark Monitoring</Title>
        <Group>
          <Switch
            label="Auto-refresh"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
          />
          <Select
            placeholder="Refresh interval"
            value={refreshInterval.toString()}
            onChange={(value) => setRefreshInterval(parseInt(value || '5'))}
            data={[
              { value: '1', label: '1 second' },
              { value: '5', label: '5 seconds' },
              { value: '10', label: '10 seconds' },
              { value: '30', label: '30 seconds' },
            ]}
            w={120}
          />
          <ActionIcon
            variant="light"
            color={notifications ? 'blue' : 'gray'}
            onClick={() => setNotifications(!notifications)}
          >
            {notifications ? <IconBell size={16} /> : <IconBellOff size={16} />}
          </ActionIcon>
        </Group>
      </Group>

      {/* Control Panel */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="md">
          <Group justify="space-between">
            <Title order={4}>Benchmark Control</Title>
            <Badge
              color={
                currentBenchmarkStatus === 'running'
                  ? 'green'
                  : currentBenchmarkStatus === 'error'
                    ? 'red'
                    : 'gray'
              }
              variant="light"
            >
              {currentBenchmarkStatus}
            </Badge>
          </Group>
        </Card.Section>

        <Card.Section p="md">
          <Group justify="space-between">
            <Group>
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={handleStartMonitoring}
                disabled={isMonitoring}
                color="green"
              >
                Start Monitoring
              </Button>
              <Button
                leftSection={<IconPlayerStop size={16} />}
                onClick={handleStopMonitoring}
                disabled={!isMonitoring}
                color="red"
              >
                Stop
              </Button>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleClearData}
                variant="light"
              >
                Clear Data
              </Button>
            </Group>

            <Group>
              <Select
                placeholder="Implementation"
                value={selectedImplementation}
                onChange={(value) => setSelectedImplementation(value || 'all')}
                data={[
                  { value: 'all', label: 'All Implementations' },
                  ...implementations.map((impl) => ({ value: impl.language, label: impl.name })),
                ]}
                w={200}
              />
              <ActionIcon variant="light">
                <IconSettings size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Card.Section>
      </Card>

      {/* Status Overview */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {currentStatus?.progress.toFixed(1) || 0}%
              </Text>
              <Text size="sm" c="dimmed">
                Progress
              </Text>
              {currentStatus && <Progress value={currentStatus.progress} size="sm" mt="xs" />}
            </div>
            <ThemeIcon variant="light" size="lg" color="blue">
              <IconActivity size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {currentStatus?.successRate.toFixed(1) || 0}%
              </Text>
              <Text size="sm" c="dimmed">
                Success Rate
              </Text>
              {currentStatus && (
                <Progress value={currentStatus.successRate} size="sm" mt="xs" color="green" />
              )}
            </div>
            <ThemeIcon variant="light" size="lg" color="green">
              <IconCheck size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {currentStatus?.estimatedTimeRemaining.toFixed(0) || 0}s
              </Text>
              <Text size="sm" c="dimmed">
                Est. Time Remaining
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="orange">
              <IconClock size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {currentStatus?.currentThroughput.toFixed(1) || 0}
              </Text>
              <Text size="sm" c="dimmed">
                Tests/min
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="purple">
              <IconTrendingUp size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Real-time Charts */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Group justify="space-between">
              <Title order={4}>Test Execution Progress</Title>
              {isMonitoring ? <Loader size="sm" /> : null}
            </Group>
          </Card.Section>

          <Card.Section p="md">
            <LineChart
              data={chartData}
              dataKey="time"
              series={[
                { name: 'completedTests', color: 'blue', label: 'Completed Tests' },
                { name: 'successRate', color: 'green', label: 'Success Rate %' },
              ]}
              h={300}
              withTooltip
              withLegend
              withDots={false}
            />
          </Card.Section>
        </Card>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Title order={4}>System Resource Usage</Title>
          </Card.Section>

          <Card.Section p="md">
            <AreaChart
              data={chartData}
              dataKey="time"
              series={[
                { name: 'cpuUsage', color: 'red', label: 'CPU %' },
                { name: 'memoryUsage', color: 'blue', label: 'Memory %' },
              ]}
              h={300}
              withTooltip
              withLegend
              fillOpacity={0.3}
            />
          </Card.Section>
        </Card>
      </SimpleGrid>

      {/* Current Status and Events */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Group justify="space-between">
              <Title order={4}>Current Execution Status</Title>
              <Badge variant="light">{recentEvents.length} recent events</Badge>
            </Group>
          </Card.Section>

          <Card.Section p="md">
            {currentBenchmarkStatus === 'running' ? (
              <Stack gap="md">
                <Group justify="space-between">
                  <Text>Current Implementation:</Text>
                  <Badge>{selectedImplementation === 'all' ? 'All' : selectedImplementation}</Badge>
                </Group>

                <Group justify="space-between">
                  <Text>Tests in Queue:</Text>
                  <Text fw={500}>{liveMetrics[liveMetrics.length - 1]?.queuedTests || 0}</Text>
                </Group>

                <Group justify="space-between">
                  <Text>Average Execution Time:</Text>
                  <Text fw={500}>
                    {liveMetrics[liveMetrics.length - 1]?.avgExecutionTime.toFixed(1) || 0}ms
                  </Text>
                </Group>

                <Alert icon={<IconActivity size={16} />} color="blue">
                  Benchmark is currently running. Live metrics are being updated every{' '}
                  {refreshInterval} seconds.
                </Alert>
              </Stack>
            ) : (
              <Alert icon={<IconPlayerPause size={16} />} color="gray">
                No benchmark currently running. Click "Start Monitoring" to begin real-time
                tracking.
              </Alert>
            )}
          </Card.Section>
        </Card>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Title order={4}>Recent Events</Title>
          </Card.Section>

          <Card.Section p="md">
            <ScrollArea h={300}>
              <Timeline>
                {recentEvents.map((event) => (
                  <Timeline.Item
                    key={event.id}
                    bullet={
                      event.type === 'test_completed' ? (
                        <IconCheck size={12} />
                      ) : event.type === 'test_failed' ? (
                        <IconX size={12} />
                      ) : event.type === 'test_started' ? (
                        <IconActivity size={12} />
                      ) : (
                        <IconAlertTriangle size={12} />
                      )
                    }
                    title={
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {event.type.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                        {event.implementation && (
                          <Badge size="xs" variant="outline">
                            {event.implementation}
                          </Badge>
                        )}
                      </Group>
                    }
                  >
                    <Text size="sm" c="dimmed">
                      {event.message}
                    </Text>
                    {event.testName && <Code size="xs">{event.testName}</Code>}
                    {event.executionTime && (
                      <Text size="xs" c="dimmed">
                        Execution time: {event.executionTime.toFixed(2)}ms
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  </Timeline.Item>
                ))}

                {recentEvents.length === 0 && (
                  <Text c="dimmed" ta="center" py="xl">
                    No recent events
                  </Text>
                )}
              </Timeline>
            </ScrollArea>
          </Card.Section>
        </Card>
      </SimpleGrid>

      {/* Resource Monitoring */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="md">
          <Title order={4}>Detailed Resource Monitoring</Title>
        </Card.Section>

        <Card.Section p="md">
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
            <Group>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  {
                    value: resourceMetrics[resourceMetrics.length - 1]?.cpuUsage || 0,
                    color: 'red',
                  },
                ]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {Math.round(resourceMetrics[resourceMetrics.length - 1]?.cpuUsage || 0)}%
                  </Text>
                }
              />
              <div>
                <Text size="sm" fw={500}>
                  CPU Usage
                </Text>
                <Text size="xs" c="dimmed">
                  Current load
                </Text>
              </div>
            </Group>

            <Group>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  {
                    value: resourceMetrics[resourceMetrics.length - 1]?.memoryUsage || 0,
                    color: 'blue',
                  },
                ]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {Math.round(resourceMetrics[resourceMetrics.length - 1]?.memoryUsage || 0)}%
                  </Text>
                }
              />
              <div>
                <Text size="sm" fw={500}>
                  Memory Usage
                </Text>
                <Text size="xs" c="dimmed">
                  RAM consumption
                </Text>
              </div>
            </Group>

            <Group>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  {
                    value: resourceMetrics[resourceMetrics.length - 1]?.networkActivity || 0,
                    color: 'green',
                  },
                ]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {Math.round(resourceMetrics[resourceMetrics.length - 1]?.networkActivity || 0)}%
                  </Text>
                }
              />
              <div>
                <Text size="sm" fw={500}>
                  Network Activity
                </Text>
                <Text size="xs" c="dimmed">
                  I/O throughput
                </Text>
              </div>
            </Group>

            <Group>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  {
                    value: resourceMetrics[resourceMetrics.length - 1]?.diskIO || 0,
                    color: 'orange',
                  },
                ]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {Math.round(resourceMetrics[resourceMetrics.length - 1]?.diskIO || 0)}%
                  </Text>
                }
              />
              <div>
                <Text size="sm" fw={500}>
                  Disk I/O
                </Text>
                <Text size="xs" c="dimmed">
                  Read/write activity
                </Text>
              </div>
            </Group>
          </SimpleGrid>
        </Card.Section>
      </Card>
    </Stack>
  )
}
