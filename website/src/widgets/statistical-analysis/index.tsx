import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import type { TestResult } from '@shared/lib'
import {
  calculateConfidenceInterval,
  calculateCorrelation,
  calculateStatistics,
  detectOutliers,
  exportChartData,
  performTTest,
} from '@shared/lib'
import { IconDownload, IconInfoCircle, IconMathFunction, IconTrendingUp } from '@tabler/icons-react'
import { useState } from 'react'

interface StatisticalAnalysisProps {
  testResults: TestResult[]
  selectedMetric: 'execution_time_ms' | 'memory_usage' | 'pass_rate'
  implementations?: string[]
}

export default function StatisticalAnalysis({
  testResults,
  selectedMetric,
  implementations = [],
}: StatisticalAnalysisProps) {
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95)
  const [outlierMethod, setOutlierMethod] = useState<'iqr' | 'zscore'>('iqr')
  const [showOutliers, setShowOutliers] = useState(true)

  // Extract metric values for analysis
  const getMetricValues = (results: TestResult[]): number[] => {
    return results
      .flatMap((result) => {
        if (selectedMetric === 'execution_time_ms') {
          return result.tests.map((test) => test.execution_time_ms)
        } else if (selectedMetric === 'memory_usage') {
          return result.process_stats?.memory_usage ? [result.process_stats.memory_usage] : []
        } else if (selectedMetric === 'pass_rate') {
          return [(result.summary.passed / result.summary.total) * 100]
        }
        return []
      })
      .filter((val) => !Number.isNaN(val) && Number.isFinite(val))
  }

  // Calculate statistics by implementation
  const statisticsByImplementation = implementations.map((impl) => {
    const implResults = testResults.filter((result) => result.language === impl)
    const values = getMetricValues(implResults)
    const stats = calculateStatistics(values)
    const confidence = calculateConfidenceInterval(values, confidenceLevel)
    const outliers = detectOutliers(values, outlierMethod)

    return {
      implementation: impl,
      values,
      stats,
      confidence,
      outliers,
      sampleSize: values.length,
    }
  })

  // Correlation analysis
  const correlationData =
    implementations.length >= 2
      ? (() => {
          const impl1Data = getMetricValues(
            testResults.filter((r) => r.language === implementations[0]),
          )
          const impl2Data = getMetricValues(
            testResults.filter((r) => r.language === implementations[1]),
          )
          const minLength = Math.min(impl1Data.length, impl2Data.length)

          if (minLength > 0) {
            return {
              implementations: [implementations[0], implementations[1]],
              correlation: calculateCorrelation(
                impl1Data.slice(0, minLength),
                impl2Data.slice(0, minLength),
              ),
              sampleSize: minLength,
            }
          }
          return null
        })()
      : null

  // T-test comparison
  const tTestResults =
    implementations.length >= 2
      ? (() => {
          const sample1 = getMetricValues(
            testResults.filter((r) => r.language === implementations[0]),
          )
          const sample2 = getMetricValues(
            testResults.filter((r) => r.language === implementations[1]),
          )

          if (sample1.length > 0 && sample2.length > 0) {
            return {
              ...performTTest(sample1, sample2),
              implementations: [implementations[0], implementations[1]],
              sampleSizes: [sample1.length, sample2.length],
            }
          }
          return null
        })()
      : null

  const handleExport = (format: 'json' | 'csv') => {
    const exportData = statisticsByImplementation.map((item) => ({
      implementation: item.implementation,
      mean: item.stats.mean,
      median: item.stats.median,
      standardDeviation: item.stats.stdDev,
      min: item.stats.min,
      max: item.stats.max,
      percentile95: item.stats.percentile95,
      percentile99: item.stats.percentile99,
      confidenceIntervalLower: item.confidence.lower,
      confidenceIntervalUpper: item.confidence.upper,
      outlierCount: item.outliers.length,
      sampleSize: item.sampleSize,
    }))

    exportChartData(exportData, {
      format,
      filename: `statistical-analysis-${selectedMetric}`,
    })
  }

  return (
    <Stack gap="md">
      {/* Controls */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Statistical Analysis Controls</Title>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="light">
                <IconDownload size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => handleExport('csv')}>Export as CSV</Menu.Item>
              <Menu.Item onClick={() => handleExport('json')}>Export as JSON</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group>
          <NumberInput
            label="Confidence Level"
            value={confidenceLevel}
            onChange={(value) => setConfidenceLevel(Number(value) || 0.95)}
            min={0.8}
            max={0.99}
            step={0.01}
            style={{ width: 150 }}
          />
          <Select
            label="Outlier Detection"
            value={outlierMethod}
            onChange={(value) => setOutlierMethod(value as 'iqr' | 'zscore')}
            data={[
              { value: 'iqr', label: 'IQR Method' },
              { value: 'zscore', label: 'Z-Score Method' },
            ]}
          />
          <Button
            variant={showOutliers ? 'filled' : 'light'}
            onClick={() => setShowOutliers(!showOutliers)}
            leftSection={<IconMathFunction size={16} />}
          >
            {showOutliers ? 'Hide' : 'Show'} Outliers
          </Button>
        </Group>
      </Card>

      {/* Descriptive Statistics */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="md">
          <Group justify="space-between">
            <Title order={4}>Descriptive Statistics</Title>
            <Tooltip label="Statistical summary of the selected metric across implementations">
              <IconInfoCircle size={16} />
            </Tooltip>
          </Group>
        </Card.Section>

        <Card.Section>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Implementation</Table.Th>
                <Table.Th>Mean</Table.Th>
                <Table.Th>Median</Table.Th>
                <Table.Th>Std Dev</Table.Th>
                <Table.Th>95% CI</Table.Th>
                <Table.Th>Outliers</Table.Th>
                <Table.Th>Sample Size</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {statisticsByImplementation.map((item) => (
                <Table.Tr key={item.implementation}>
                  <Table.Td>
                    <Text fw={500}>{item.implementation}</Text>
                  </Table.Td>
                  <Table.Td>{item.stats.mean.toFixed(3)}</Table.Td>
                  <Table.Td>{item.stats.median.toFixed(3)}</Table.Td>
                  <Table.Td>{item.stats.stdDev.toFixed(3)}</Table.Td>
                  <Table.Td>
                    [{item.confidence.lower.toFixed(3)}, {item.confidence.upper.toFixed(3)}]
                  </Table.Td>
                  <Table.Td>
                    {showOutliers && (
                      <Badge color={item.outliers.length > 0 ? 'red' : 'green'} variant="light">
                        {item.outliers.length}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>{item.sampleSize}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card.Section>
      </Card>

      {/* Correlation Analysis */}
      {correlationData && (
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Group justify="space-between">
              <Title order={4}>Correlation Analysis</Title>
              <IconTrendingUp size={16} />
            </Group>
          </Card.Section>

          <Card.Section p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text>Implementations:</Text>
                <Text fw={500}>{correlationData.implementations.join(' vs ')}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Correlation Coefficient:</Text>
                <Badge
                  color={
                    Math.abs(correlationData.correlation) > 0.7
                      ? 'green'
                      : Math.abs(correlationData.correlation) > 0.3
                        ? 'yellow'
                        : 'red'
                  }
                  variant="light"
                >
                  {correlationData.correlation.toFixed(3)}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text>Sample Size:</Text>
                <Text>{correlationData.sampleSize}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Interpretation:</Text>
                <Text size="sm" c="dimmed">
                  {Math.abs(correlationData.correlation) > 0.7
                    ? 'Strong correlation'
                    : Math.abs(correlationData.correlation) > 0.3
                      ? 'Moderate correlation'
                      : 'Weak correlation'}
                </Text>
              </Group>
            </Stack>
          </Card.Section>
        </Card>
      )}

      {/* Statistical Significance Testing */}
      {tTestResults && (
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Title order={4}>Statistical Significance Test (T-Test)</Title>
          </Card.Section>

          <Card.Section p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text>Comparison:</Text>
                <Text fw={500}>{tTestResults.implementations.join(' vs ')}</Text>
              </Group>
              <Group justify="space-between">
                <Text>T-Statistic:</Text>
                <Text fw={500}>{tTestResults.tStatistic.toFixed(3)}</Text>
              </Group>
              <Group justify="space-between">
                <Text>P-Value:</Text>
                <Text fw={500}>{tTestResults.pValue.toFixed(3)}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Statistically Significant:</Text>
                <Badge color={tTestResults.significant ? 'green' : 'red'} variant="light">
                  {tTestResults.significant ? 'Yes (p < 0.05)' : 'No (p ≥ 0.05)'}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text>Sample Sizes:</Text>
                <Text>{tTestResults.sampleSizes.join(', ')}</Text>
              </Group>
              {tTestResults.significant && (
                <Alert color="green" icon={<IconInfoCircle size={16} />}>
                  The difference between implementations is statistically significant at the 95%
                  confidence level.
                </Alert>
              )}
            </Stack>
          </Card.Section>
        </Card>
      )}

      {/* Outlier Details */}
      {showOutliers && (
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="md">
            <Title order={4}>Outlier Analysis</Title>
          </Card.Section>

          <Card.Section>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Implementation</Table.Th>
                  <Table.Th>Outlier Values</Table.Th>
                  <Table.Th>Percentage</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {statisticsByImplementation.map((item) => (
                  <Table.Tr key={item.implementation}>
                    <Table.Td>
                      <Text fw={500}>{item.implementation}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ maxWidth: 300 }} truncate="end">
                        {item.outliers.length > 0
                          ? item.outliers
                              .slice(0, 5)
                              .map((val) => val.toFixed(2))
                              .join(', ') + (item.outliers.length > 5 ? '...' : '')
                          : 'None'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {((item.outliers.length / item.sampleSize) * 100).toFixed(1)}%
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card.Section>
        </Card>
      )}
    </Stack>
  )
}
