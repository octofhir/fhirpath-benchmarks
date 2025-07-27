import {
  ActionIcon,
  Badge,
  Checkbox,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core'
import { ChartContainer } from '@shared/ui'
import { IconCheck, IconMinus, IconX } from '@tabler/icons-react'
import { useCallback, useMemo, useState } from 'react'

interface TestCase {
  id: string
  name: string
  category: string
  description: string
  complexity: 'low' | 'medium' | 'high'
}

interface TestResult {
  testId: string
  implementation: string
  status: 'pass' | 'fail' | 'error' | 'skip'
  executionTime: number
  errorMessage?: string
  output?: unknown
}

interface TestResultsMatrixProps {
  testCases: TestCase[]
  results: TestResult[]
  implementations: string[]
}

export function TestResultsMatrix({ testCases, results, implementations }: TestResultsMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all')
  const [showOnlyFailures, setShowOnlyFailures] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ testId: string; implementation: string } | null>(
    null,
  )

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(testCases.map((test) => test.category))]
    return cats
  }, [testCases])

  // Filter test cases based on selected filters
  const filteredTestCases = useMemo(() => {
    return testCases.filter((test) => {
      const categoryMatch = selectedCategory === 'all' || test.category === selectedCategory
      const complexityMatch = selectedComplexity === 'all' || test.complexity === selectedComplexity

      if (!categoryMatch || !complexityMatch) return false

      if (showOnlyFailures) {
        const hasFailures = implementations.some((impl) => {
          const result = results.find((r) => r.testId === test.id && r.implementation === impl)
          return result && (result.status === 'fail' || result.status === 'error')
        })
        return hasFailures
      }

      return true
    })
  }, [testCases, selectedCategory, selectedComplexity, showOnlyFailures, implementations, results])

  // Get result for specific test and implementation
  const getResult = useCallback(
    (testId: string, implementation: string): TestResult | undefined => {
      return results.find((r) => r.testId === testId && r.implementation === implementation)
    },
    [results],
  )

  // Get status icon and color
  const getStatusDisplay = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return { icon: IconCheck, color: 'green', label: 'Pass' }
      case 'fail':
        return { icon: IconX, color: 'red', label: 'Fail' }
      case 'error':
        return { icon: IconX, color: 'orange', label: 'Error' }
      case 'skip':
        return { icon: IconMinus, color: 'gray', label: 'Skip' }
      default:
        return { icon: IconMinus, color: 'gray', label: 'No Result' }
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTests = filteredTestCases.length * implementations.length
    const passCount = filteredTestCases.reduce((acc, test) => {
      return (
        acc +
        implementations.filter((impl) => {
          const result = getResult(test.id, impl)
          return result?.status === 'pass'
        }).length
      )
    }, 0)

    const failCount = filteredTestCases.reduce((acc, test) => {
      return (
        acc +
        implementations.filter((impl) => {
          const result = getResult(test.id, impl)
          return result?.status === 'fail'
        }).length
      )
    }, 0)

    const errorCount = filteredTestCases.reduce((acc, test) => {
      return (
        acc +
        implementations.filter((impl) => {
          const result = getResult(test.id, impl)
          return result?.status === 'error'
        }).length
      )
    }, 0)

    return {
      total: totalTests,
      pass: passCount,
      fail: failCount,
      error: errorCount,
      passRate: totalTests > 0 ? (passCount / totalTests) * 100 : 0,
    }
  }, [filteredTestCases, implementations, getResult])

  return (
    <Stack gap="md">
      {/* Controls */}
      <Paper p="md" withBorder>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Category"
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value || 'all')}
              data={categories.map((cat) => ({
                value: cat,
                label: cat === 'all' ? 'All Categories' : cat,
              }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Complexity"
              value={selectedComplexity}
              onChange={(value) => setSelectedComplexity(value || 'all')}
              data={[
                { value: 'all', label: 'All Complexities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Checkbox
              label="Show only failures"
              checked={showOnlyFailures}
              onChange={(event) => setShowOnlyFailures(event.currentTarget.checked)}
              mt="xl"
            />
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Statistics */}
      <Group>
        <Badge size="lg" color="blue">
          {stats.total} Total Tests
        </Badge>
        <Badge size="lg" color="green">
          {stats.pass} Passed
        </Badge>
        <Badge size="lg" color="red">
          {stats.fail} Failed
        </Badge>
        <Badge size="lg" color="orange">
          {stats.error} Errors
        </Badge>
        <Badge size="lg" color="teal">
          {stats.passRate.toFixed(1)}% Pass Rate
        </Badge>
      </Group>

      {/* Matrix */}
      <ChartContainer
        title="Test Results Matrix"
        badge={{ label: `${filteredTestCases.length} Tests`, color: 'blue' }}
      >
        <ScrollArea>
          <Table highlightOnHover striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 200 }}>Test Case</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Complexity</Table.Th>
                {implementations.map((impl) => (
                  <Table.Th key={impl} style={{ textAlign: 'center', minWidth: 120 }}>
                    {impl}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTestCases.map((test) => (
                <Table.Tr key={test.id}>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {test.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {test.description}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light">
                      {test.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      color={
                        test.complexity === 'high'
                          ? 'red'
                          : test.complexity === 'medium'
                            ? 'yellow'
                            : 'green'
                      }
                    >
                      {test.complexity}
                    </Badge>
                  </Table.Td>
                  {implementations.map((impl) => {
                    const result = getResult(test.id, impl)
                    const status = result?.status || 'skip'
                    const display = getStatusDisplay(status)
                    const isHovered =
                      hoveredCell?.testId === test.id && hoveredCell?.implementation === impl

                    return (
                      <Table.Td key={impl} style={{ textAlign: 'center' }}>
                        <Tooltip
                          label={
                            result ? (
                              <Stack gap={4}>
                                <Text size="xs">Status: {display.label}</Text>
                                <Text size="xs">Time: {result.executionTime.toFixed(2)}ms</Text>
                                {result.errorMessage && (
                                  <Text size="xs" c="red">
                                    Error: {result.errorMessage}
                                  </Text>
                                )}
                              </Stack>
                            ) : (
                              'No result available'
                            )
                          }
                          withArrow
                        >
                          <ActionIcon
                            variant={isHovered ? 'filled' : 'light'}
                            color={display.color}
                            size="sm"
                            onMouseEnter={() =>
                              setHoveredCell({ testId: test.id, implementation: impl })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                              cursor: result ? 'pointer' : 'default',
                              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                              transition: 'transform 150ms ease',
                            }}
                          >
                            <display.icon size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    )
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </ChartContainer>

      {/* Implementation Summary */}
      <Grid>
        {implementations.map((impl) => {
          const implResults = filteredTestCases
            .map((test) => getResult(test.id, impl))
            .filter(Boolean)
          const implStats = {
            total: filteredTestCases.length,
            pass: implResults.filter((r) => r?.status === 'pass').length,
            fail: implResults.filter((r) => r?.status === 'fail').length,
            error: implResults.filter((r) => r?.status === 'error').length,
          }
          const passRate = implStats.total > 0 ? (implStats.pass / implStats.total) * 100 : 0

          return (
            <Grid.Col key={impl} span={{ base: 12, sm: 6, lg: 3 }}>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {impl}
                  </Text>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Pass Rate:
                    </Text>
                    <Badge
                      size="sm"
                      color={passRate > 90 ? 'green' : passRate > 75 ? 'yellow' : 'red'}
                    >
                      {passRate.toFixed(1)}%
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Passed:
                    </Text>
                    <Text size="xs">
                      {implStats.pass}/{implStats.total}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Failed:
                    </Text>
                    <Text size="xs" c="red">
                      {implStats.fail}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Errors:
                    </Text>
                    <Text size="xs" c="orange">
                      {implStats.error}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Grid.Col>
          )
        })}
      </Grid>
    </Stack>
  )
}
