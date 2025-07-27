import { AreaChart, LineChart } from '@mantine/charts'
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Breadcrumbs,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { clearCache, loadBenchmarkResults, loadTestResults } from '@shared/api'
import type { BenchmarkResult, TestResult } from '@shared/lib'
import { formatExecutionTime, formatMemoryUsage, formatPercentage } from '@shared/lib'
import {
  IconArrowLeft,
  IconBug,
  IconChartLine,
  IconCheck,
  IconClock,
  IconDownload,
  IconListCheck,
  IconMoodCog,
  IconRefresh,
  IconX,
} from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function BenchmarkDetailPage() {
  const { implementation } = useParams<{ implementation: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<TestResult | null>(null)
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')

  const loadData = useCallback(async () => {
    if (!implementation) return

    setLoading(true)
    setError(null)

    try {
      const [testRes, benchmarkRes] = await Promise.all([
        loadTestResults(implementation),
        loadBenchmarkResults(implementation),
      ])

      setTestResults(testRes)
      setBenchmarkResults(benchmarkRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [implementation])

  const handleRefresh = async () => {
    clearCache()
    await loadData()
  }

  useEffect(() => {
    if (implementation) {
      loadData()
    }
  }, [implementation, loadData])

  if (!implementation) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Invalid Implementation">
          No implementation specified in the URL.
        </Alert>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading {implementation} benchmark data...</Text>
        </Group>
      </Container>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Error loading data">
          {error}
        </Alert>
      </Container>
    )
  }

  const passRate = testResults?.summary
    ? (testResults.summary.passed / testResults.summary.total) * 100
    : 0

  // Mock performance trend data
  const performanceTrend = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    avgTime: 20 + Math.random() * 10,
    memoryUsage: 50 + Math.random() * 20,
  }))

  return (
    <Container size="xl" py="xl">
      {/* Breadcrumbs */}
      <Breadcrumbs mb="md">
        <Anchor onClick={() => navigate('/')}>Dashboard</Anchor>
        <Text>{implementation.charAt(0).toUpperCase() + implementation.slice(1)}</Text>
      </Breadcrumbs>

      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Group>
          <ActionIcon variant="light" onClick={() => navigate('/')}>
            <IconArrowLeft size={16} />
          </ActionIcon>
          <Title order={1}>
            {implementation.charAt(0).toUpperCase() + implementation.slice(1)} Implementation
          </Title>
        </Group>
        <Group>
          <Tooltip label="Refresh data">
            <ActionIcon variant="light" onClick={handleRefresh} loading={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export data">
            <ActionIcon variant="light">
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Key Metrics Cards */}
      {testResults && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconListCheck size={24} color="green" />
                <Badge variant="light" color="green">
                  Tests
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {testResults.summary?.passed || 0}/{testResults.summary?.total || 0}
              </Text>
              <Progress value={passRate} color="green" size="sm" />
              <Text size="sm" c="dimmed">
                {formatPercentage(passRate)} Pass Rate
              </Text>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconClock size={24} color="blue" />
                <Badge variant="light" color="blue">
                  Performance
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {formatExecutionTime(
                  testResults.summary?.execution_time_ms && testResults.summary?.total
                    ? testResults.summary.execution_time_ms / testResults.summary.total
                    : 0,
                )}
              </Text>
              <Text size="sm" c="dimmed">
                Avg Execution Time
              </Text>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconMoodCog size={24} color="purple" />
                <Badge variant="light" color="purple">
                  Memory
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {testResults.process_stats
                  ? formatMemoryUsage(testResults.process_stats.memory_usage)
                  : 'N/A'}
              </Text>
              <Text size="sm" c="dimmed">
                Memory Usage
              </Text>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconBug size={24} color="red" />
                <Badge variant="light" color="red">
                  Errors
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {testResults.summary?.errors || 0}
              </Text>
              <Text size="sm" c="dimmed">
                Error Count
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>
      )}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'overview')}>
        <Tabs.List mb="md">
          <Tabs.Tab value="overview" leftSection={<IconChartLine size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="tests" leftSection={<IconListCheck size={16} />}>
            Test Results
          </Tabs.Tab>
          <Tabs.Tab value="performance" leftSection={<IconClock size={16} />}>
            Performance
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Grid>
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Card withBorder>
                <Card.Section withBorder inheritPadding py="md">
                  <Title order={4}>Performance Trend</Title>
                </Card.Section>
                <Card.Section p="md">
                  <LineChart
                    h={300}
                    data={performanceTrend}
                    dataKey="day"
                    series={[{ name: 'avgTime', color: 'blue.6', label: 'Avg Time (ms)' }]}
                    curveType="monotone"
                    withTooltip
                  />
                </Card.Section>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Card withBorder>
                <Card.Section withBorder inheritPadding py="md">
                  <Title order={4}>Memory Usage Trend</Title>
                </Card.Section>
                <Card.Section p="md">
                  <AreaChart
                    h={300}
                    data={performanceTrend}
                    dataKey="day"
                    series={[{ name: 'memoryUsage', color: 'purple.6', label: 'Memory (MB)' }]}
                    curveType="monotone"
                    withTooltip
                  />
                </Card.Section>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="tests">
          {testResults && (
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Group justify="space-between">
                  <Title order={4}>Test Results</Title>
                  <Badge variant="light">{testResults.tests?.length || 0} tests</Badge>
                </Group>
              </Card.Section>

              <Card.Section>
                <Table.ScrollContainer minWidth={600}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Test Name</Table.Th>
                        <Table.Th>File</Table.Th>
                        <Table.Th>Execution Time</Table.Th>
                        <Table.Th>Error</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {testResults.tests?.slice(0, 20).map((test, index) => (
                        <Table.Tr key={`${test.name}-${index}`}>
                          <Table.Td>
                            {test.passed ? (
                              <IconCheck size={16} color="green" />
                            ) : (
                              <IconX size={16} color="red" />
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {test.name || 'Unknown test'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {test.file || 'No file'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatExecutionTime(test.execution_time_ms || 0)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            {test.error ? (
                              <Text size="xs" c="red" truncate="end">
                                {typeof test.error === 'string'
                                  ? test.error
                                  : JSON.stringify(test.error)}
                              </Text>
                            ) : (
                              <Text size="xs" c="dimmed">
                                No error
                              </Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      )) || []}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card.Section>
            </Card>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="performance">
          {benchmarkResults?.summary ? (
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Benchmark Performance</Title>
              </Card.Section>

              <Card.Section p="md">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text>Total Cases:</Text>
                    <Text fw={500}>{benchmarkResults.summary.total_cases || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Total Iterations:</Text>
                    <Text fw={500}>{benchmarkResults.summary.total_iterations || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Average Time per Case:</Text>
                    <Text fw={500}>
                      {formatExecutionTime(benchmarkResults.summary.avg_time_per_case_ms || 0)}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Total Execution Time:</Text>
                    <Text fw={500}>
                      {formatExecutionTime(benchmarkResults.summary.total_time_ms || 0)}
                    </Text>
                  </Group>
                </Stack>
              </Card.Section>
            </Card>
          ) : (
            <Card withBorder>
              <Stack align="center" py="xl">
                <Text c="dimmed">No benchmark data available</Text>
              </Stack>
            </Card>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}
