import { BarChart, PieChart } from '@mantine/charts'
import {
  Badge,
  Button,
  Card,
  Group,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import type { ImplementationMetadata, TestCaseResult } from '@shared/lib'
import { IconAlertTriangle, IconBug, IconFilter, IconRefresh } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

interface FailureAnalysisProps {
  implementations: ImplementationMetadata[]
  testResults?: TestCaseResult[]
}

interface FailurePattern {
  type: string
  count: number
  percentage: number
  implementations: string[]
  examples: string[]
}

interface ErrorCluster {
  category: string
  count: number
  color: string
  patterns: string[]
}

export function FailureAnalysis({ implementations, testResults = [] }: FailureAnalysisProps) {
  const [selectedImplementation, setSelectedImplementation] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('30d')

  // Calculate failure patterns from test results
  const failurePatterns = useMemo(() => {
    const patterns: Record<string, FailurePattern> = {}

    testResults.forEach((test) => {
      if (!test.passed) {
        // Categorize failures by test name patterns
        const testName = test.name || ''
        let category = 'unknown'

        if (testName.toLowerCase().includes('distinct')) {
          category = 'distinct_operations'
        } else if (
          testName.toLowerCase().includes('skip') ||
          testName.toLowerCase().includes('take')
        ) {
          category = 'collection_operations'
        } else if (testName.toLowerCase().includes('substring')) {
          category = 'string_operations'
        } else if (
          testName.toLowerCase().includes('where') ||
          testName.toLowerCase().includes('select')
        ) {
          category = 'filter_operations'
        } else if (testName.toLowerCase().includes('union')) {
          category = 'union_operations'
        } else if (testName.toLowerCase().includes('abs')) {
          category = 'math_operations'
        } else {
          category = 'other_operations'
        }

        if (!patterns[category]) {
          patterns[category] = {
            type: category,
            count: 0,
            percentage: 0,
            implementations: [],
            examples: [],
          }
        }

        patterns[category].count++
        if (
          !patterns[category].examples.includes(testName) &&
          patterns[category].examples.length < 3
        ) {
          patterns[category].examples.push(testName)
        }
      }
    })

    const totalFailures = Object.values(patterns).reduce((sum, p) => sum + p.count, 0)
    Object.values(patterns).forEach((pattern) => {
      pattern.percentage = totalFailures > 0 ? (pattern.count / totalFailures) * 100 : 0
    })

    // If no failures, create demo data for visualization
    if (totalFailures === 0 && testResults.length > 0) {
      return [
        {
          type: 'all_tests_passing',
          count: testResults.length,
          percentage: 100,
          implementations: [],
          examples: ['All tests currently passing'],
        },
      ]
    }

    return Object.values(patterns).sort((a, b) => b.count - a.count)
  }, [testResults])

  // Calculate error distribution by implementation
  const errorDistribution = useMemo(() => {
    if (!implementations || implementations.length === 0) return []

    return implementations.map((impl) => ({
      name: impl.language,
      failed: impl.failed_tests,
      errors: impl.error_count,
      total: impl.total_tests,
      passRate: impl.pass_rate,
    }))
  }, [implementations])

  // Calculate error clusters
  const errorClusters = useMemo(() => {
    const clusters: ErrorCluster[] = [
      {
        category: 'Unimplemented Functions',
        count: failurePatterns
          .filter((p) => p.type === 'distinct_operations' || p.type === 'collection_operations')
          .reduce((sum, p) => sum + p.count, 0),
        color: 'red',
        patterns: ['distinct()', 'isDistinct()', 'skip()', 'take()'],
      },
      {
        category: 'String Processing',
        count: failurePatterns
          .filter((p) => p.type === 'string_operations')
          .reduce((sum, p) => sum + p.count, 0),
        color: 'orange',
        patterns: ['substring()', 'indexOf()', 'length()'],
      },
      {
        category: 'Expression Parsing',
        count: failurePatterns
          .filter((p) => p.type === 'filter_operations' || p.type === 'union_operations')
          .reduce((sum, p) => sum + p.count, 0),
        color: 'yellow',
        patterns: ['where()', 'select()', 'union |'],
      },
      {
        category: 'Math Operations',
        count: failurePatterns
          .filter((p) => p.type === 'math_operations')
          .reduce((sum, p) => sum + p.count, 0),
        color: 'blue',
        patterns: ['abs()', 'round()', 'sqrt()'],
      },
    ]

    return clusters.filter((c) => c.count > 0)
  }, [failurePatterns])

  // Chart data for failure trends
  const failureTrendData = useMemo(() => {
    if (!implementations || implementations.length === 0) return []

    return implementations.map((impl) => ({
      implementation: impl.language,
      failureRate: 100 - impl.pass_rate,
      errorCount: impl.error_count,
      avgExecutionTime: impl.avg_execution_time,
    }))
  }, [implementations])

  return (
    <Stack gap="xl">
      {/* Header with filters */}
      <Group justify="space-between">
        <Title order={3}>Failure Analysis Dashboard</Title>
        <Group>
          <Select
            placeholder="Implementation"
            value={selectedImplementation}
            onChange={(value) => setSelectedImplementation(value || 'all')}
            data={[
              { value: 'all', label: 'All Implementations' },
              ...(implementations || []).map((impl) => ({
                value: impl.language,
                label: impl.name,
              })),
            ]}
            w={200}
          />
          <Select
            placeholder="Time Range"
            value={timeRange}
            onChange={(value) => setTimeRange(value || '30d')}
            data={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            w={150}
          />
          <Button variant="light" leftSection={<IconRefresh size={16} />}>
            Refresh
          </Button>
        </Group>
      </Group>

      {/* Error Type Distribution */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Group justify="space-between">
              <Title order={4}>Error Type Distribution</Title>
              <IconAlertTriangle size={20} color="red" />
            </Group>
          </Card.Section>

          <Card.Section p="md">
            {errorClusters.length > 0 ? (
              <PieChart
                data={errorClusters.map((cluster) => ({
                  name: cluster.category,
                  value: cluster.count,
                  color: cluster.color,
                }))}
                withLabelsLine
                labelsPosition="outside"
                labelsType="percent"
                withTooltip
                h={300}
              />
            ) : (
              <Group justify="center" h={300}>
                <Text c="dimmed">No error data available</Text>
              </Group>
            )}
          </Card.Section>
        </Card>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Group justify="space-between">
              <Title order={4}>Failure Patterns by Category</Title>
              <IconBug size={20} color="orange" />
            </Group>
          </Card.Section>

          <Card.Section p="md">
            {failurePatterns.length > 0 ? (
              <BarChart
                data={failurePatterns.slice(0, 6).map((pattern) => ({
                  category: pattern.type.replace(/_/g, ' '),
                  count: pattern.count,
                  percentage: pattern.percentage,
                }))}
                dataKey="category"
                series={[{ name: 'count', color: 'red' }]}
                h={300}
                withTooltip
                tickLine="x"
              />
            ) : (
              <Group justify="center" h={300}>
                <Text c="dimmed">No failure patterns detected</Text>
              </Group>
            )}
          </Card.Section>
        </Card>
      </SimpleGrid>

      {/* Implementation Error Comparison */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="md">
          <Title order={4}>Error Distribution by Implementation</Title>
        </Card.Section>

        <Card.Section p="md">
          {errorDistribution.length > 0 ? (
            <BarChart
              data={errorDistribution}
              dataKey="name"
              series={[
                { name: 'failed', color: 'red', label: 'Failed Tests' },
                { name: 'errors', color: 'orange', label: 'Errors' },
              ]}
              h={400}
              withTooltip
              withLegend
              tickLine="x"
            />
          ) : (
            <Group justify="center" h={400}>
              <Text c="dimmed">No implementation data available</Text>
            </Group>
          )}
        </Card.Section>
      </Card>

      {/* Failure Rate vs Performance Correlation */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Title order={4}>Failure Rate vs Execution Time</Title>
          </Card.Section>

          <Card.Section p="md">
            {failureTrendData.length > 0 ? (
              <div
                style={{
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: '8px',
                }}
              >
                <Stack align="center" gap="md">
                  <Text fw={500}>Performance vs Failure Rate</Text>
                  {failureTrendData.map((item) => (
                    <Group key={item.implementation} gap="md">
                      <Badge
                        color={
                          item.failureRate > 20 ? 'red' : item.failureRate > 10 ? 'orange' : 'green'
                        }
                        variant="light"
                      >
                        {item.implementation}
                      </Badge>
                      <Text size="sm">
                        {item.avgExecutionTime.toFixed(1)}ms | {item.failureRate.toFixed(1)}%
                        failures
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </div>
            ) : (
              <Group justify="center" h={300}>
                <Text c="dimmed">No data available for failure rate analysis</Text>
              </Group>
            )}
          </Card.Section>
        </Card>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Title order={4}>Error Clusters Summary</Title>
          </Card.Section>

          <Card.Section p="md">
            <Stack gap="md">
              {errorClusters.map((cluster) => (
                <Group
                  key={cluster.category}
                  justify="space-between"
                  p="sm"
                  style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}
                >
                  <Group>
                    <RingProgress
                      size={40}
                      thickness={4}
                      sections={[
                        {
                          value:
                            errorClusters.length > 0
                              ? (cluster.count / Math.max(...errorClusters.map((c) => c.count))) *
                                100
                              : 0,
                          color: cluster.color,
                        },
                      ]}
                    />
                    <div>
                      <Text fw={500}>{cluster.category}</Text>
                      <Text size="sm" c="dimmed">
                        {cluster.patterns.join(', ')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color={cluster.color} variant="light">
                    {cluster.count} failures
                  </Badge>
                </Group>
              ))}

              {errorClusters.length === 0 && (
                <Text c="dimmed" ta="center" py="xl">
                  No error clusters identified
                </Text>
              )}
            </Stack>
          </Card.Section>
        </Card>
      </SimpleGrid>

      {/* Common Error Messages */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="md">
          <Group justify="space-between">
            <Title order={4}>Most Common Failure Patterns</Title>
            <Badge variant="light">{failurePatterns.length} patterns identified</Badge>
          </Group>
        </Card.Section>

        <Card.Section p="md">
          <Stack gap="md">
            {failurePatterns.slice(0, 5).map((pattern) => (
              <Group
                key={pattern.type}
                justify="space-between"
                p="md"
                style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px' }}
              >
                <div style={{ flex: 1 }}>
                  <Group mb="xs">
                    <Text fw={500}>{pattern.type.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Badge size="sm" color="red" variant="light">
                      {pattern.count} occurrences
                    </Badge>
                    <Badge size="sm" variant="outline">
                      {pattern.percentage.toFixed(1)}%
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Examples: {pattern.examples.join(', ')}
                  </Text>
                </div>
                <Tooltip label="View detailed analysis">
                  <Button variant="light" size="xs" leftSection={<IconFilter size={14} />}>
                    Analyze
                  </Button>
                </Tooltip>
              </Group>
            ))}

            {failurePatterns.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                No failure patterns detected in current data
              </Text>
            )}
          </Stack>
        </Card.Section>
      </Card>
    </Stack>
  )
}
