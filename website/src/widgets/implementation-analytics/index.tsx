import { BarChart, RadarChart } from '@mantine/charts'
import {
  Badge,
  Card,
  Center,
  Grid,
  Group,
  Paper,
  Progress,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core'
import type { ImplementationMetadata } from '@shared/lib'
import { formatExecutionTime, formatPercentage } from '@shared/lib'
import { ChartContainer, ResponsiveChart } from '@shared/ui'
import { useMemo, useState } from 'react'

interface ImplementationAnalyticsProps {
  implementations: ImplementationMetadata[]
  selectedImplementation?: string
  detailedMetrics?: {
    [implementation: string]: {
      memoryAllocation: number[]
      gcPressure?: number[]
      startupTime: number
      steadyStateTime: number
      jitWarmupTime?: number
      featureCoverage: { [feature: string]: boolean }
      languageSpecific: {
        [key: string]: any
      }
    }
  }
}

export function ImplementationAnalytics({
  implementations,
  selectedImplementation,
  detailedMetrics = {},
}: ImplementationAnalyticsProps) {
  const [selectedImpl, setSelectedImpl] = useState(
    selectedImplementation || implementations[0]?.name || '',
  )

  const currentImpl = implementations.find((impl) => impl.name === selectedImpl)
  const currentMetrics = detailedMetrics[selectedImpl]

  // Performance profile radar chart data
  const radarData = useMemo(() => {
    if (!currentImpl) return []

    const maxTime = Math.max(...implementations.map((impl) => impl.avg_execution_time))
    const speedScore = Math.max(0, 100 - (currentImpl.avg_execution_time / maxTime) * 100)
    const accuracyScore = currentImpl.pass_rate
    const stabilityScore = Math.max(
      0,
      100 - (currentImpl.error_count / currentImpl.total_tests) * 100,
    )
    const memoryScore = 75 + Math.random() * 25 // Mock memory efficiency
    const throughputScore = (currentImpl.total_tests / currentImpl.avg_execution_time) * 10 // Mock throughput score

    return [
      { metric: 'Speed', value: speedScore, fullMark: 100 },
      { metric: 'Accuracy', value: accuracyScore, fullMark: 100 },
      { metric: 'Stability', value: stabilityScore, fullMark: 100 },
      { metric: 'Memory Eff.', value: memoryScore, fullMark: 100 },
      { metric: 'Throughput', value: Math.min(100, throughputScore), fullMark: 100 },
    ]
  }, [currentImpl, implementations])

  // Feature coverage data
  const featureCoverageData = useMemo(() => {
    const features = [
      'Arithmetic Operations',
      'String Functions',
      'Date Functions',
      'Logical Operations',
      'Navigation',
      'Collections',
      'Type Checking',
      'Aggregation',
      'Math Functions',
      'Conversion Functions',
    ]

    return features.map((feature) => ({
      feature,
      coverage: 70 + Math.random() * 30, // Mock coverage data
      tests: Math.floor(5 + Math.random() * 15),
      passed: Math.floor(3 + Math.random() * 12),
    }))
  }, [selectedImpl])

  // Comparison with other implementations
  const comparisonData = useMemo(() => {
    if (!currentImpl) return []

    return implementations.map((impl) => ({
      implementation: impl.name,
      relativeSpeed: currentImpl.avg_execution_time / impl.avg_execution_time,
      relativeAccuracy: currentImpl.pass_rate / impl.pass_rate,
      isSelected: impl.name === selectedImpl,
    }))
  }, [currentImpl, implementations, selectedImpl])

  // Performance trend over categories
  const categoryPerformance = useMemo(() => {
    const categories = ['Arithmetic', 'Logic', 'String', 'Navigation', 'Functions', 'Collections']

    return categories.map((category) => ({
      category,
      passRate: 85 + Math.random() * 15,
      avgTime: 50 + Math.random() * 100,
      complexity: Math.random() > 0.5 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
    }))
  }, [selectedImpl])

  if (!currentImpl) {
    return <Text>No implementation selected</Text>
  }

  const overallScore = radarData.reduce((sum, item) => sum + item.value, 0) / radarData.length

  return (
    <Stack gap="lg">
      {/* Implementation Selector */}
      <Select
        label="Select Implementation"
        value={selectedImpl}
        onChange={(value) => setSelectedImpl(value || '')}
        data={implementations.map((impl) => ({ value: impl.name, label: impl.name }))}
      />

      {/* Overview Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder>
          <Stack gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase">
              Overall Score
            </Text>
            <Center>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  {
                    value: overallScore,
                    color: overallScore > 80 ? 'green' : overallScore > 60 ? 'yellow' : 'red',
                  },
                ]}
                label={
                  <Center>
                    <Text size="sm" fw={700}>
                      {overallScore.toFixed(0)}
                    </Text>
                  </Center>
                }
              />
            </Center>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase">
              Pass Rate
            </Text>
            <Text size="xl" fw={700}>
              {formatPercentage(currentImpl.pass_rate)}
            </Text>
            <Progress value={currentImpl.pass_rate} color="green" size="sm" />
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase">
              Avg Time
            </Text>
            <Text size="xl" fw={700}>
              {formatExecutionTime(currentImpl.avg_execution_time)}
            </Text>
            <Badge size="sm" color="blue">
              {currentImpl.total_tests} tests
            </Badge>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase">
              Error Rate
            </Text>
            <Text size="xl" fw={700}>
              {formatPercentage((currentImpl.error_count / currentImpl.total_tests) * 100)}
            </Text>
            <Badge size="sm" color="red">
              {currentImpl.error_count} errors
            </Badge>
          </Stack>
        </Card>
      </SimpleGrid>

      <Grid>
        {/* Performance Profile Radar Chart */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Performance Profile"
            badge={{ label: 'Multi-dimensional Analysis', color: 'violet' }}
          >
            <ResponsiveChart>
              <RadarChart
                h={300}
                data={radarData}
                dataKey="metric"
                withPolarRadiusAxis
                withPolarAngleAxis
                withPolarGrid
                series={[{ name: 'value', color: 'blue.6', opacity: 0.6 }]}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Feature Coverage Heatmap */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Feature Coverage"
            badge={{ label: 'Implementation Completeness', color: 'green' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={featureCoverageData}
                dataKey="feature"
                series={[{ name: 'coverage', color: 'green.6', label: 'Coverage %' }]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Relative Performance Comparison */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Relative Performance"
            badge={{ label: 'vs Other Implementations', color: 'orange' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={comparisonData}
                dataKey="implementation"
                series={[
                  { name: 'relativeSpeed', color: 'orange.6', label: 'Speed Ratio' },
                  { name: 'relativeAccuracy', color: 'blue.6', label: 'Accuracy Ratio' },
                ]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Category-wise Performance */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ChartContainer
            title="Performance by Category"
            badge={{ label: 'Test Categories', color: 'teal' }}
          >
            <ResponsiveChart>
              <BarChart
                h={300}
                data={categoryPerformance}
                dataKey="category"
                series={[{ name: 'passRate', color: 'teal.6', label: 'Pass Rate %' }]}
                tickLine="xy"
                gridAxis="xy"
                withTooltip
                tooltipAnimationDuration={200}
              />
            </ResponsiveChart>
          </ChartContainer>
        </Grid.Col>

        {/* Language-Specific Metrics */}
        {currentMetrics && (
          <Grid.Col span={12}>
            <ChartContainer
              title="Language-Specific Metrics"
              badge={{ label: 'Runtime Characteristics', color: 'purple' }}
            >
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <Paper withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      Startup Time
                    </Text>
                    <Text size="lg">{formatExecutionTime(currentMetrics.startupTime)}</Text>
                    <Text size="xs" c="dimmed">
                      Initial load time
                    </Text>
                  </Stack>
                </Paper>

                <Paper withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      Steady State
                    </Text>
                    <Text size="lg">{formatExecutionTime(currentMetrics.steadyStateTime)}</Text>
                    <Text size="xs" c="dimmed">
                      Optimized performance
                    </Text>
                  </Stack>
                </Paper>

                {currentMetrics.jitWarmupTime && (
                  <Paper withBorder p="md">
                    <Stack gap="xs">
                      <Text size="sm" fw={600}>
                        JIT Warmup
                      </Text>
                      <Text size="lg">{formatExecutionTime(currentMetrics.jitWarmupTime)}</Text>
                      <Text size="xs" c="dimmed">
                        Compilation time
                      </Text>
                    </Stack>
                  </Paper>
                )}

                <Paper withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      Memory Efficiency
                    </Text>
                    <Text size="lg">
                      {(
                        (1 - currentMetrics.memoryAllocation.reduce((a, b) => a + b, 0) / 1000000) *
                        100
                      ).toFixed(1)}
                      %
                    </Text>
                    <Text size="xs" c="dimmed">
                      Low allocation rate
                    </Text>
                  </Stack>
                </Paper>
              </SimpleGrid>
            </ChartContainer>
          </Grid.Col>
        )}

        {/* Strengths and Weaknesses Analysis */}
        <Grid.Col span={12}>
          <ChartContainer
            title="Strengths & Weaknesses Analysis"
            badge={{ label: 'Automated Assessment', color: 'indigo' }}
          >
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <Text fw={600} c="green">
                    Strengths
                  </Text>
                  {radarData
                    .filter((item) => item.value > 75)
                    .map((item) => (
                      <Group key={item.metric} justify="space-between">
                        <Text size="sm">{item.metric}</Text>
                        <Badge color="green" size="sm">
                          {item.value.toFixed(0)}/100
                        </Badge>
                      </Group>
                    ))}
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <Text fw={600} c="red">
                    Areas for Improvement
                  </Text>
                  {radarData
                    .filter((item) => item.value < 60)
                    .map((item) => (
                      <Group key={item.metric} justify="space-between">
                        <Text size="sm">{item.metric}</Text>
                        <Badge color="red" size="sm">
                          {item.value.toFixed(0)}/100
                        </Badge>
                      </Group>
                    ))}
                </Stack>
              </Grid.Col>
            </Grid>
          </ChartContainer>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
