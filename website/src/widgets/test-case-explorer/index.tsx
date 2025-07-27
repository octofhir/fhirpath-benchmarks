import { BarChart } from '@mantine/charts'
import {
  ActionIcon,
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
  Tooltip,
} from '@mantine/core'
import type { ImplementationMetadata, TestCaseResult } from '@shared/lib'
import {
  IconChartBar,
  IconClock,
  IconCode,
  IconFilter,
  IconNetwork,
  IconRefresh,
  IconSearch,
  IconTarget,
  IconTree,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'

interface TestCaseExplorerProps {
  implementations: ImplementationMetadata[]
  testResults?: TestCaseResult[]
}

interface TestCaseNode {
  id: string
  name: string
  category: string
  complexity: 'low' | 'medium' | 'high'
  dependencies: string[]
  executionTime: number
  successRate: number
  errorCount: number
}

interface TestDependency {
  source: string
  target: string
  weight: number
  type: 'functional' | 'data' | 'semantic'
}

interface ComplexityMetrics {
  syntaxComplexity: number
  dataComplexity: number
  logicalComplexity: number
  overallScore: number
}

export function TestCaseExplorer({ implementations, testResults = [] }: TestCaseExplorerProps) {
  const [activeTab, setActiveTab] = useState<string>('dependency-graph')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [complexityFilter, setComplexityFilter] = useState<string>('all')

  // Transform test results into test case nodes
  const testCaseNodes = useMemo(() => {
    const nodeMap = new Map<string, TestCaseNode>()

    testResults.forEach((test) => {
      if (!nodeMap.has(test.name)) {
        // Determine category from test name
        let category = 'other'
        const testName = test.name.toLowerCase()

        if (testName.includes('math') || testName.includes('abs') || testName.includes('round')) {
          category = 'math'
        } else if (
          testName.includes('string') ||
          testName.includes('substring') ||
          testName.includes('length')
        ) {
          category = 'string'
        } else if (
          testName.includes('collection') ||
          testName.includes('distinct') ||
          testName.includes('skip')
        ) {
          category = 'collection'
        } else if (
          testName.includes('logic') ||
          testName.includes('where') ||
          testName.includes('select')
        ) {
          category = 'logic'
        } else if (testName.includes('date') || testName.includes('time')) {
          category = 'temporal'
        }

        // Determine complexity based on test characteristics
        let complexity: 'low' | 'medium' | 'high' = 'low'
        if (
          testName.includes('complex') ||
          testName.includes('nested') ||
          testName.includes('recursive')
        ) {
          complexity = 'high'
        } else if (
          testName.includes('multi') ||
          testName.includes('combined') ||
          testName.includes('union')
        ) {
          complexity = 'medium'
        }

        nodeMap.set(test.name, {
          id: test.name,
          name: test.name,
          category,
          complexity,
          dependencies: [], // Will be computed based on semantic similarity
          executionTime: test.execution_time_ms,
          successRate: test.passed ? 100 : 0,
          errorCount: test.passed ? 0 : 1,
        })
      }
    })

    return Array.from(nodeMap.values())
  }, [testResults])

  // Calculate test dependencies based on naming patterns and categories
  const testDependencies = useMemo(() => {
    const dependencies: TestDependency[] = []

    testCaseNodes.forEach((node) => {
      testCaseNodes.forEach((otherNode) => {
        if (node.id !== otherNode.id && node.category === otherNode.category) {
          // Check for naming similarity
          const nameSimilarity = calculateNameSimilarity(node.name, otherNode.name)
          if (nameSimilarity > 0.3) {
            dependencies.push({
              source: node.id,
              target: otherNode.id,
              weight: nameSimilarity,
              type: 'semantic',
            })
          }
        }
      })
    })

    return dependencies
  }, [testCaseNodes, calculateNameSimilarity])

  // Calculate complexity metrics for each test case
  const complexityMetrics = useMemo(() => {
    const metrics = new Map<string, ComplexityMetrics>()

    testCaseNodes.forEach((node) => {
      const syntaxComplexity = calculateSyntaxComplexity(node.name)
      const dataComplexity = calculateDataComplexity(node.name)
      const logicalComplexity = calculateLogicalComplexity(node.name)

      metrics.set(node.id, {
        syntaxComplexity,
        dataComplexity,
        logicalComplexity,
        overallScore: (syntaxComplexity + dataComplexity + logicalComplexity) / 3,
      })
    })

    return metrics
  }, [
    testCaseNodes,
    calculateDataComplexity,
    calculateLogicalComplexity,
    calculateSyntaxComplexity,
  ])

  // Filter test cases based on current filters
  const filteredTestCases = useMemo(() => {
    return testCaseNodes.filter((node) => {
      const categoryMatch = selectedCategory === 'all' || node.category === selectedCategory
      const complexityMatch = complexityFilter === 'all' || node.complexity === complexityFilter
      return categoryMatch && complexityMatch
    })
  }, [testCaseNodes, selectedCategory, complexityFilter])

  // Helper functions
  function calculateNameSimilarity(name1: string, name2: string): number {
    const words1 = name1.toLowerCase().split(/[^a-z0-9]/i)
    const words2 = name2.toLowerCase().split(/[^a-z0-9]/i)

    let commonWords = 0
    words1.forEach((word) => {
      if (words2.includes(word) && word.length > 2) {
        commonWords++
      }
    })

    return commonWords / Math.max(words1.length, words2.length)
  }

  function calculateSyntaxComplexity(testName: string): number {
    // Simple heuristic based on test name complexity
    const length = testName.length
    const words = testName.split(/[^a-z0-9]/i).length
    const numbers = (testName.match(/\d+/g) || []).length

    return Math.min(100, length / 10 + words * 5 + numbers * 10)
  }

  function calculateDataComplexity(testName: string): number {
    // Heuristic based on data operation indicators
    let score = 20
    if (testName.toLowerCase().includes('nested')) score += 30
    if (testName.toLowerCase().includes('array')) score += 20
    if (testName.toLowerCase().includes('union')) score += 25
    if (testName.toLowerCase().includes('join')) score += 25

    return Math.min(100, score)
  }

  function calculateLogicalComplexity(testName: string): number {
    // Heuristic based on logical operation indicators
    let score = 15
    if (testName.toLowerCase().includes('where')) score += 20
    if (testName.toLowerCase().includes('select')) score += 20
    if (testName.toLowerCase().includes('filter')) score += 25
    if (testName.toLowerCase().includes('complex')) score += 40

    return Math.min(100, score)
  }

  return (
    <Stack gap="xl">
      {/* Header with filters */}
      <Group justify="space-between">
        <Title order={3}>Test Case Explorer</Title>
        <Group>
          <Select
            placeholder="Category"
            value={selectedCategory}
            onChange={(value) => setSelectedCategory(value || 'all')}
            data={[
              { value: 'all', label: 'All Categories' },
              { value: 'math', label: 'Math Operations' },
              { value: 'string', label: 'String Operations' },
              { value: 'collection', label: 'Collection Operations' },
              { value: 'logic', label: 'Logic Operations' },
              { value: 'temporal', label: 'Temporal Operations' },
              { value: 'other', label: 'Other' },
            ]}
            w={180}
          />
          <Select
            placeholder="Complexity"
            value={complexityFilter}
            onChange={(value) => setComplexityFilter(value || 'all')}
            data={[
              { value: 'all', label: 'All Complexity' },
              { value: 'low', label: 'Low Complexity' },
              { value: 'medium', label: 'Medium Complexity' },
              { value: 'high', label: 'High Complexity' },
            ]}
            w={160}
          />
          <Button variant="light" leftSection={<IconRefresh size={16} />}>
            Refresh
          </Button>
        </Group>
      </Group>

      {/* Summary Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {filteredTestCases.length}
              </Text>
              <Text size="sm" c="dimmed">
                Test Cases
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg">
              <IconTarget size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {Math.round(
                  filteredTestCases.reduce((sum, node) => sum + node.successRate, 0) /
                    filteredTestCases.length,
                ) || 0}
                %
              </Text>
              <Text size="sm" c="dimmed">
                Avg Success Rate
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="green">
              <IconChartBar size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {Math.round(
                  filteredTestCases.reduce((sum, node) => sum + node.executionTime, 0) /
                    filteredTestCases.length,
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
                {testDependencies.length}
              </Text>
              <Text size="sm" c="dimmed">
                Dependencies
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="purple">
              <IconNetwork size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="dependency-graph" leftSection={<IconNetwork size={16} />}>
            Dependency Graph
          </Tabs.Tab>
          <Tabs.Tab value="complexity-analysis" leftSection={<IconChartBar size={16} />}>
            Complexity Analysis
          </Tabs.Tab>
          <Tabs.Tab value="parsing-tree" leftSection={<IconTree size={16} />}>
            Parsing Tree
          </Tabs.Tab>
          <Tabs.Tab value="test-details" leftSection={<IconCode size={16} />}>
            Test Details
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dependency-graph" pt="md">
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="md">
              <Group justify="space-between">
                <Title order={4}>Test Case Dependency Network</Title>
                <Badge variant="light">{testDependencies.length} connections</Badge>
              </Group>
            </Card.Section>

            <Card.Section p="md">
              {/* Network graph would go here - placeholder for now */}
              <div
                style={{
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: '8px',
                }}
              >
                <Stack align="center" gap="md">
                  <IconNetwork size={48} color="var(--mantine-color-gray-5)" />
                  <Text c="dimmed">Interactive dependency graph visualization</Text>
                  <Text size="sm" c="dimmed">
                    Shows relationships between test cases based on naming patterns and categories
                  </Text>
                </Stack>
              </div>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="complexity-analysis" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Complexity Distribution</Title>
              </Card.Section>

              <Card.Section p="md">
                <BarChart
                  data={[
                    {
                      complexity: 'Low',
                      count: filteredTestCases.filter((tc) => tc.complexity === 'low').length,
                    },
                    {
                      complexity: 'Medium',
                      count: filteredTestCases.filter((tc) => tc.complexity === 'medium').length,
                    },
                    {
                      complexity: 'High',
                      count: filteredTestCases.filter((tc) => tc.complexity === 'high').length,
                    },
                  ]}
                  dataKey="complexity"
                  series={[{ name: 'count', color: 'blue' }]}
                  h={300}
                  withTooltip
                />
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Complexity vs Success Rate</Title>
              </Card.Section>

              <Card.Section p="md">
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
                    <IconChartBar size={48} color="var(--mantine-color-gray-5)" />
                    <Text c="dimmed">Scatter plot: Complexity vs Success Rate</Text>
                  </Stack>
                </div>
              </Card.Section>
            </Card>
          </SimpleGrid>

          <Card withBorder mt="xl">
            <Card.Section withBorder inheritPadding py="md">
              <Title order={4}>Detailed Complexity Metrics</Title>
            </Card.Section>

            <Card.Section p="md">
              <ScrollArea h={300}>
                <Stack gap="md">
                  {filteredTestCases.slice(0, 10).map((testCase) => {
                    const metrics = complexityMetrics.get(testCase.id)
                    if (!metrics) return null

                    return (
                      <Group
                        key={testCase.id}
                        justify="space-between"
                        p="md"
                        style={{
                          border: '1px solid var(--mantine-color-gray-3)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Text fw={500}>{testCase.name}</Text>
                          <Text size="sm" c="dimmed" mb="xs">
                            {testCase.category} • {testCase.complexity} complexity
                          </Text>

                          <Grid>
                            <Grid.Col span={4}>
                              <Text size="xs" c="dimmed">
                                Syntax
                              </Text>
                              <Progress value={metrics.syntaxComplexity} size="sm" color="blue" />
                            </Grid.Col>
                            <Grid.Col span={4}>
                              <Text size="xs" c="dimmed">
                                Data
                              </Text>
                              <Progress value={metrics.dataComplexity} size="sm" color="orange" />
                            </Grid.Col>
                            <Grid.Col span={4}>
                              <Text size="xs" c="dimmed">
                                Logic
                              </Text>
                              <Progress value={metrics.logicalComplexity} size="sm" color="green" />
                            </Grid.Col>
                          </Grid>
                        </div>

                        <Badge
                          color={
                            metrics.overallScore > 70
                              ? 'red'
                              : metrics.overallScore > 40
                                ? 'orange'
                                : 'green'
                          }
                          variant="light"
                        >
                          {Math.round(metrics.overallScore)}
                        </Badge>
                      </Group>
                    )
                  })}
                </Stack>
              </ScrollArea>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="parsing-tree" pt="md">
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="md">
              <Group justify="space-between">
                <Title order={4}>Expression Parsing Tree Visualization</Title>
                <Group>
                  <Select
                    placeholder="Select test case"
                    data={filteredTestCases
                      .slice(0, 10)
                      .map((tc) => ({ value: tc.id, label: tc.name }))}
                    w={300}
                  />
                  <ActionIcon variant="light">
                    <IconSearch size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card.Section>

            <Card.Section p="md">
              <div
                style={{
                  height: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: '8px',
                }}
              >
                <Stack align="center" gap="md">
                  <IconTree size={48} color="var(--mantine-color-gray-5)" />
                  <Text c="dimmed">Interactive parsing tree visualization</Text>
                  <Text size="sm" c="dimmed">
                    Shows the AST structure of FHIRPath expressions
                  </Text>
                </Stack>
              </div>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="test-details" pt="md">
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="md">
              <Group justify="space-between">
                <Title order={4}>Test Case Details</Title>
                <Group>
                  <Button variant="light" size="sm" leftSection={<IconFilter size={14} />}>
                    Filter
                  </Button>
                  <Button variant="light" size="sm" leftSection={<IconSearch size={14} />}>
                    Search
                  </Button>
                </Group>
              </Group>
            </Card.Section>

            <Card.Section p="md">
              <ScrollArea h={500}>
                <Stack gap="md">
                  {filteredTestCases.map((testCase) => (
                    <Group
                      key={testCase.id}
                      justify="space-between"
                      p="md"
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Group mb="xs">
                          <Text fw={500}>{testCase.name}</Text>
                          <Badge
                            size="sm"
                            color={
                              testCase.complexity === 'high'
                                ? 'red'
                                : testCase.complexity === 'medium'
                                  ? 'orange'
                                  : 'green'
                            }
                          >
                            {testCase.complexity}
                          </Badge>
                          <Badge size="sm" variant="outline">
                            {testCase.category}
                          </Badge>
                        </Group>

                        <Grid>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Execution Time
                            </Text>
                            <Text size="sm" fw={500}>
                              {testCase.executionTime.toFixed(2)}ms
                            </Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Success Rate
                            </Text>
                            <Text
                              size="sm"
                              fw={500}
                              c={testCase.successRate > 80 ? 'green' : 'red'}
                            >
                              {testCase.successRate}%
                            </Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Dependencies
                            </Text>
                            <Text size="sm" fw={500}>
                              {testCase.dependencies.length}
                            </Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="sm" c="dimmed">
                              Errors
                            </Text>
                            <Text size="sm" fw={500} c={testCase.errorCount > 0 ? 'red' : 'green'}>
                              {testCase.errorCount}
                            </Text>
                          </Grid.Col>
                        </Grid>
                      </div>

                      <Tooltip label="View details">
                        <ActionIcon variant="light">
                          <IconCode size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Card.Section>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
