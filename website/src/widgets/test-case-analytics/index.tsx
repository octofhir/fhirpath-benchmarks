import { BarChart, DonutChart, LineChart, ScatterChart } from '@mantine/charts'
import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import type { ImplementationMetadata, TestCaseResult } from '@shared/lib'
import {
  IconAlertTriangle,
  IconBrain,
  IconClock,
  IconFilter,
  IconSpeed,
  IconTarget,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'

interface TestCaseAnalyticsProps {
  implementations: ImplementationMetadata[]
  testResults?: TestCaseResult[]
}

interface ExecutionTimeMetrics {
  testName: string
  avgTime: number
  minTime: number
  maxTime: number
  stdDev: number
  trend: 'up' | 'down' | 'stable'
  distribution: number[]
}

interface SuccessRateMetrics {
  testName: string
  successRate: number
  trend: 'improving' | 'declining' | 'stable'
  implementations: {
    language: string
    success: boolean
    executionTime: number
  }[]
}

interface DifficultyMetrics {
  testName: string
  difficultyScore: number
  category: 'easy' | 'medium' | 'hard' | 'expert'
  factors: {
    syntaxComplexity: number
    failureRate: number
    executionVariance: number
    implementationCoverage: number
  }
}

export function TestCaseAnalytics({ implementations, testResults = [] }: TestCaseAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<string>('execution-time')
  const [selectedMetric, setSelectedMetric] = useState<string>('avg-time')
  const [timeRange, setTimeRange] = useState<string>('all')

  // Calculate execution time metrics
  const executionTimeMetrics = useMemo(() => {
    const metricsMap = new Map<string, ExecutionTimeMetrics>()

    testResults.forEach((test) => {
      if (!metricsMap.has(test.name)) {
        metricsMap.set(test.name, {
          testName: test.name,
          avgTime: test.execution_time_ms,
          minTime: test.execution_time_ms,
          maxTime: test.execution_time_ms,
          stdDev: 0,
          trend: 'stable',
          distribution: [test.execution_time_ms],
        })
      } else {
        const existing = metricsMap.get(test.name)!
        existing.distribution.push(test.execution_time_ms)
        existing.avgTime =
          existing.distribution.reduce((sum, time) => sum + time, 0) / existing.distribution.length
        existing.minTime = Math.min(existing.minTime, test.execution_time_ms)
        existing.maxTime = Math.max(existing.maxTime, test.execution_time_ms)

        // Calculate standard deviation
        const mean = existing.avgTime
        const variance =
          existing.distribution.reduce((sum, time) => sum + (time - mean) ** 2, 0) /
          existing.distribution.length
        existing.stdDev = Math.sqrt(variance)

        // Determine trend (simplified)
        if (existing.distribution.length >= 3) {
          const recent = existing.distribution.slice(-3)
          const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0]
          const isDecreasing = recent[2] < recent[1] && recent[1] < recent[0]
          existing.trend = isIncreasing ? 'up' : isDecreasing ? 'down' : 'stable'
        }
      }
    })

    return Array.from(metricsMap.values()).sort((a, b) => b.avgTime - a.avgTime)
  }, [testResults])

  // Calculate success rate metrics
  const successRateMetrics = useMemo(() => {
    const metricsMap = new Map<string, SuccessRateMetrics>()

    testResults.forEach((test) => {
      if (!metricsMap.has(test.name)) {
        metricsMap.set(test.name, {
          testName: test.name,
          successRate: test.passed ? 100 : 0,
          trend: 'stable',
          implementations: [],
        })
      }

      const existing = metricsMap.get(test.name)!
      existing.implementations.push({
        language: 'unknown', // Would need to match with implementation data
        success: test.passed,
        executionTime: test.execution_time_ms,
      })

      // Recalculate success rate
      const passCount = existing.implementations.filter((impl) => impl.success).length
      existing.successRate = (passCount / existing.implementations.length) * 100
    })

    return Array.from(metricsMap.values()).sort((a, b) => a.successRate - b.successRate)
  }, [testResults])

  // Calculate difficulty metrics
  const difficultyMetrics = useMemo(() => {
    const metricsMap = new Map<string, DifficultyMetrics>()

    testResults.forEach((test) => {
      if (!metricsMap.has(test.name)) {
        const executionMetric = executionTimeMetrics.find((em) => em.testName === test.name)
        const successMetric = successRateMetrics.find((sm) => sm.testName === test.name)

        // Calculate complexity factors
        const syntaxComplexity = calculateSyntaxComplexity(test.name)
        const failureRate = successMetric ? 100 - successMetric.successRate : 100
        const executionVariance = executionMetric
          ? (executionMetric.stdDev / executionMetric.avgTime) * 100
          : 0
        const implementationCoverage = successMetric ? successMetric.implementations.length : 0

        // Calculate overall difficulty score
        const difficultyScore =
          syntaxComplexity * 0.3 +
          failureRate * 0.4 +
          executionVariance * 0.2 +
          (100 - implementationCoverage * 10) * 0.1

        let category: 'easy' | 'medium' | 'hard' | 'expert' = 'easy'
        if (difficultyScore > 80) category = 'expert'
        else if (difficultyScore > 60) category = 'hard'
        else if (difficultyScore > 40) category = 'medium'

        metricsMap.set(test.name, {
          testName: test.name,
          difficultyScore: Math.min(100, difficultyScore),
          category,
          factors: {
            syntaxComplexity,
            failureRate,
            executionVariance,
            implementationCoverage,
          },
        })
      }
    })

    return Array.from(metricsMap.values()).sort((a, b) => b.difficultyScore - a.difficultyScore)
  }, [testResults, executionTimeMetrics, successRateMetrics, calculateSyntaxComplexity])

  // Helper function
  function calculateSyntaxComplexity(testName: string): number {
    let score = 10
    const name = testName.toLowerCase()

    if (name.includes('nested')) score += 25
    if (name.includes('complex')) score += 30
    if (name.includes('recursive')) score += 35
    if (name.includes('multi')) score += 20
    if (name.includes('union')) score += 15
    if (name.includes('where')) score += 15
    if (name.includes('select')) score += 15

    return Math.min(100, score)
  }

  // Generate trend data for charts
  const executionTrendData = useMemo(() => {
    return executionTimeMetrics.slice(0, 10).map((metric, _index) => ({
      test: `${metric.testName.substring(0, 20)}...`,
      avgTime: metric.avgTime,
      minTime: metric.minTime,
      maxTime: metric.maxTime,
      variance: metric.stdDev,
    }))
  }, [executionTimeMetrics])

  const difficultyDistribution = useMemo(() => {
    const distribution = { easy: 0, medium: 0, hard: 0, expert: 0 }
    difficultyMetrics.forEach((metric) => {
      distribution[metric.category]++
    })

    return [
      { name: 'Easy', value: distribution.easy, color: 'green' },
      { name: 'Medium', value: distribution.medium, color: 'yellow' },
      { name: 'Hard', value: distribution.hard, color: 'orange' },
      { name: 'Expert', value: distribution.expert, color: 'red' },
    ]
  }, [difficultyMetrics])

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between">
        <Title order={3}>Test Case Analytics</Title>
        <Group>
          <Select
            placeholder="Metric"
            value={selectedMetric}
            onChange={(value) => setSelectedMetric(value || 'avg-time')}
            data={[
              { value: 'avg-time', label: 'Average Time' },
              { value: 'success-rate', label: 'Success Rate' },
              { value: 'difficulty', label: 'Difficulty Score' },
              { value: 'variance', label: 'Execution Variance' },
            ]}
            w={180}
          />
          <Select
            placeholder="Time Range"
            value={timeRange}
            onChange={(value) => setTimeRange(value || 'all')}
            data={[
              { value: 'all', label: 'All Time' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            w={140}
          />
          <Button variant="light" leftSection={<IconFilter size={16} />}>
            Filter
          </Button>
        </Group>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {Math.round(
                  executionTimeMetrics.reduce((sum, m) => sum + m.avgTime, 0) /
                    executionTimeMetrics.length,
                ) || 0}
                ms
              </Text>
              <Text size="sm" c="dimmed">
                Avg Execution Time
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="blue">
              <IconClock size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {Math.round(
                  successRateMetrics.reduce((sum, m) => sum + m.successRate, 0) /
                    successRateMetrics.length,
                ) || 0}
                %
              </Text>
              <Text size="sm" c="dimmed">
                Avg Success Rate
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="green">
              <IconTarget size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {Math.round(
                  difficultyMetrics.reduce((sum, m) => sum + m.difficultyScore, 0) /
                    difficultyMetrics.length,
                ) || 0}
              </Text>
              <Text size="sm" c="dimmed">
                Avg Difficulty Score
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="orange">
              <IconBrain size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {executionTimeMetrics.filter((m) => m.trend === 'up').length}
              </Text>
              <Text size="sm" c="dimmed">
                Performance Regressions
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="red">
              <IconTrendingUp size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="execution-time" leftSection={<IconClock size={16} />}>
            Execution Time Analysis
          </Tabs.Tab>
          <Tabs.Tab value="success-trends" leftSection={<IconTrendingUp size={16} />}>
            Success Rate Trends
          </Tabs.Tab>
          <Tabs.Tab value="difficulty-scoring" leftSection={<IconBrain size={16} />}>
            Difficulty Scoring
          </Tabs.Tab>
          <Tabs.Tab value="performance-insights" leftSection={<IconSpeed size={16} />}>
            Performance Insights
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="execution-time" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Execution Time Distribution</Title>
              </Card.Section>

              <Card.Section p="md">
                <BarChart
                  data={executionTrendData}
                  dataKey="test"
                  series={[
                    { name: 'avgTime', color: 'blue', label: 'Average Time' },
                    { name: 'variance', color: 'red', label: 'Variance' },
                  ]}
                  h={300}
                  withTooltip
                  withLegend
                  tickLine="x"
                />
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Execution Time Trends</Title>
              </Card.Section>

              <Card.Section p="md">
                <LineChart
                  data={executionTrendData}
                  dataKey="test"
                  series={[
                    { name: 'minTime', color: 'green', label: 'Min Time' },
                    { name: 'avgTime', color: 'blue', label: 'Avg Time' },
                    { name: 'maxTime', color: 'red', label: 'Max Time' },
                  ]}
                  h={300}
                  withTooltip
                  withLegend
                />
              </Card.Section>
            </Card>
          </SimpleGrid>

          <Card withBorder mt="xl">
            <Card.Section withBorder inheritPadding py="md">
              <Title order={4}>Detailed Execution Metrics</Title>
            </Card.Section>

            <Card.Section p="md">
              <ScrollArea h={400}>
                <Stack gap="md">
                  {executionTimeMetrics.slice(0, 15).map((metric) => (
                    <Group
                      key={metric.testName}
                      justify="space-between"
                      p="md"
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Group mb="xs">
                          <Text fw={500}>{metric.testName}</Text>
                          <Badge
                            color={
                              metric.trend === 'up'
                                ? 'red'
                                : metric.trend === 'down'
                                  ? 'green'
                                  : 'gray'
                            }
                            leftSection={
                              metric.trend === 'up' ? (
                                <IconTrendingUp size={12} />
                              ) : metric.trend === 'down' ? (
                                <IconTrendingDown size={12} />
                              ) : null
                            }
                          >
                            {metric.trend}
                          </Badge>
                        </Group>

                        <Grid>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Average
                            </Text>
                            <Text size="sm" fw={500}>
                              {metric.avgTime.toFixed(2)}ms
                            </Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Range
                            </Text>
                            <Text size="sm" fw={500}>
                              {metric.minTime.toFixed(1)} - {metric.maxTime.toFixed(1)}ms
                            </Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Std Dev
                            </Text>
                            <Text size="sm" fw={500}>
                              {metric.stdDev.toFixed(2)}ms
                            </Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Samples
                            </Text>
                            <Text size="sm" fw={500}>
                              {metric.distribution.length}
                            </Text>
                          </Grid.Col>
                        </Grid>
                      </div>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="success-trends" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Success Rate Distribution</Title>
              </Card.Section>

              <Card.Section p="md">
                <BarChart
                  data={successRateMetrics.slice(0, 10).map((metric) => ({
                    test: `${metric.testName.substring(0, 15)}...`,
                    successRate: metric.successRate,
                    implementations: metric.implementations.length,
                  }))}
                  dataKey="test"
                  series={[{ name: 'successRate', color: 'green', label: 'Success Rate %' }]}
                  h={300}
                  withTooltip
                  tickLine="x"
                />
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Success vs Implementation Coverage</Title>
              </Card.Section>

              <Card.Section p="md">
                <ScatterChart
                  data={successRateMetrics.slice(0, 20).map((metric) => ({
                    x: metric.implementations.length,
                    y: metric.successRate,
                    name: metric.testName,
                  }))}
                  dataKey={{ x: 'x', y: 'y' }}
                  h={300}
                  xAxisLabel="Implementation Count"
                  yAxisLabel="Success Rate (%)"
                  withTooltip
                />
              </Card.Section>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="difficulty-scoring" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Difficulty Distribution</Title>
              </Card.Section>

              <Card.Section p="md">
                <DonutChart data={difficultyDistribution} h={300} withLabels withTooltip />
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Top Difficult Test Cases</Title>
              </Card.Section>

              <Card.Section p="md">
                <ScrollArea h={300}>
                  <Stack gap="md">
                    {difficultyMetrics.slice(0, 8).map((metric) => (
                      <Group
                        key={metric.testName}
                        justify="space-between"
                        p="sm"
                        style={{
                          backgroundColor: 'var(--mantine-color-gray-0)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Text fw={500} size="sm">
                            {metric.testName}
                          </Text>
                          <Progress
                            value={metric.difficultyScore}
                            size="sm"
                            color={
                              metric.category === 'expert'
                                ? 'red'
                                : metric.category === 'hard'
                                  ? 'orange'
                                  : 'yellow'
                            }
                            mt="xs"
                          />
                        </div>

                        <Badge
                          color={
                            metric.category === 'expert'
                              ? 'red'
                              : metric.category === 'hard'
                                ? 'orange'
                                : metric.category === 'medium'
                                  ? 'yellow'
                                  : 'green'
                          }
                          variant="light"
                        >
                          {Math.round(metric.difficultyScore)}
                        </Badge>
                      </Group>
                    ))}
                  </Stack>
                </ScrollArea>
              </Card.Section>
            </Card>
          </SimpleGrid>

          <Card withBorder mt="xl">
            <Card.Section withBorder inheritPadding py="md">
              <Title order={4}>Difficulty Factor Analysis</Title>
            </Card.Section>

            <Card.Section p="md">
              <ScrollArea h={400}>
                <Stack gap="md">
                  {difficultyMetrics.slice(0, 10).map((metric) => (
                    <Group
                      key={metric.testName}
                      justify="space-between"
                      p="md"
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Group mb="md">
                          <Text fw={500}>{metric.testName}</Text>
                          <Badge
                            color={
                              metric.category === 'expert'
                                ? 'red'
                                : metric.category === 'hard'
                                  ? 'orange'
                                  : metric.category === 'medium'
                                    ? 'yellow'
                                    : 'green'
                            }
                          >
                            {metric.category}
                          </Badge>
                          <Badge variant="outline">{Math.round(metric.difficultyScore)}</Badge>
                        </Group>

                        <Grid>
                          <Grid.Col span={3}>
                            <Text size="xs" c="dimmed">
                              Syntax Complexity
                            </Text>
                            <Progress
                              value={metric.factors.syntaxComplexity}
                              size="sm"
                              color="blue"
                            />
                            <Text size="xs">{Math.round(metric.factors.syntaxComplexity)}%</Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="xs" c="dimmed">
                              Failure Rate
                            </Text>
                            <Progress value={metric.factors.failureRate} size="sm" color="red" />
                            <Text size="xs">{Math.round(metric.factors.failureRate)}%</Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="xs" c="dimmed">
                              Execution Variance
                            </Text>
                            <Progress
                              value={metric.factors.executionVariance}
                              size="sm"
                              color="orange"
                            />
                            <Text size="xs">{Math.round(metric.factors.executionVariance)}%</Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="xs" c="dimmed">
                              Implementation Coverage
                            </Text>
                            <Progress
                              value={metric.factors.implementationCoverage * 10}
                              size="sm"
                              color="green"
                            />
                            <Text size="xs">{metric.factors.implementationCoverage}</Text>
                          </Grid.Col>
                        </Grid>
                      </div>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="performance-insights" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Group justify="space-between">
                  <Title order={4}>Performance Alerts</Title>
                  <ThemeIcon color="red" variant="light">
                    <IconAlertTriangle size={16} />
                  </ThemeIcon>
                </Group>
              </Card.Section>

              <Card.Section p="md">
                <Stack gap="md">
                  {executionTimeMetrics
                    .filter((m) => m.trend === 'up')
                    .slice(0, 5)
                    .map((metric) => (
                      <Group
                        key={metric.testName}
                        justify="space-between"
                        p="sm"
                        style={{
                          backgroundColor: 'var(--mantine-color-red-0)',
                          borderRadius: '8px',
                          border: '1px solid var(--mantine-color-red-3)',
                        }}
                      >
                        <div>
                          <Text fw={500} size="sm">
                            {metric.testName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Performance regression detected
                          </Text>
                        </div>
                        <Badge color="red" variant="light">
                          +{Math.round(((metric.maxTime - metric.minTime) / metric.minTime) * 100)}%
                        </Badge>
                      </Group>
                    ))}

                  {executionTimeMetrics.filter((m) => m.trend === 'up').length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                      No performance regressions detected
                    </Text>
                  )}
                </Stack>
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Optimization Opportunities</Title>
              </Card.Section>

              <Card.Section p="md">
                <Stack gap="md">
                  {executionTimeMetrics
                    .filter((m) => m.avgTime > 100)
                    .slice(0, 5)
                    .map((metric) => (
                      <Group
                        key={metric.testName}
                        justify="space-between"
                        p="sm"
                        style={{
                          backgroundColor: 'var(--mantine-color-yellow-0)',
                          borderRadius: '8px',
                          border: '1px solid var(--mantine-color-yellow-3)',
                        }}
                      >
                        <div>
                          <Text fw={500} size="sm">
                            {metric.testName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            High execution time ({metric.avgTime.toFixed(1)}ms)
                          </Text>
                        </div>
                        <Badge color="yellow" variant="light">
                          Optimize
                        </Badge>
                      </Group>
                    ))}

                  {executionTimeMetrics.filter((m) => m.avgTime > 100).length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                      All tests performing well
                    </Text>
                  )}
                </Stack>
              </Card.Section>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
