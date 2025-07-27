import { BarChart } from '@mantine/charts'
import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  MultiSelect,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import type { ImplementationMetadata, TestCaseResult } from '@shared/lib'
import {
  IconAlertTriangle,
  IconBolt,
  IconChartRadar,
  IconCheck,
  IconGitCompare,
  IconDownload,
  IconEye,
  IconInfoCircle,
  IconSearch,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'

interface TestComparisonProps {
  implementations: ImplementationMetadata[]
  testResults?: TestCaseResult[]
}

interface ComparisonResult {
  testName: string
  implementations: {
    language: string
    passed: boolean
    executionTime: number
    actual?: any
    expected?: any
    error?: string
    relativePerformance: number
  }[]
  consensusResult: boolean
  performanceVariance: number
  difficultyScore: number
  category: string
}

// interface PerformanceImpact {
//   testName: string
//   baselineTime: number
//   implementations: {
//     language: string
//     executionTime: number
//     impact: 'positive' | 'negative' | 'neutral'
//     impactMagnitude: number
//   }[]
//   overallImpact: 'high' | 'medium' | 'low'
// }

interface ImplementationProfile {
  language: string
  strengths: string[]
  weaknesses: string[]
  performanceCategory: 'fast' | 'medium' | 'slow'
  reliabilityScore: number
  consistencyScore: number
  coverageScore: number
}

export function TestComparison({ implementations, testResults = [] }: TestComparisonProps) {
  const [selectedImplementations, setSelectedImplementations] = useState<string[]>([])
  const [selectedTestCases, _setSelectedTestCases] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState<string>('side-by-side')
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('comparison-matrix')

  // Transform test results into comparison format
  const comparisonResults = useMemo(() => {
    const testMap = new Map<string, ComparisonResult>()

    testResults.forEach((test) => {
      if (!testMap.has(test.name)) {
        testMap.set(test.name, {
          testName: test.name,
          implementations: [],
          consensusResult: true,
          performanceVariance: 0,
          difficultyScore: 0,
          category: categorizeTest(test.name),
        })
      }

      const comparison = testMap.get(test.name)!
      comparison.implementations.push({
        language: 'unknown', // Would need implementation mapping
        passed: test.passed,
        executionTime: test.execution_time_ms,
        actual: test.actual,
        expected: test.expected,
        error: test.error,
        relativePerformance: 100, // Will be calculated
      })
    })

    // Calculate metrics for each test
    testMap.forEach((comparison) => {
      const times = comparison.implementations.map((impl) => impl.executionTime)
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const variance = times.reduce((sum, time) => sum + (time - avgTime) ** 2, 0) / times.length

      comparison.performanceVariance = Math.sqrt(variance)

      // Calculate relative performance
      const minTime = Math.min(...times)
      comparison.implementations.forEach((impl) => {
        impl.relativePerformance = minTime > 0 ? (minTime / impl.executionTime) * 100 : 100
      })

      // Check consensus
      const passResults = comparison.implementations.map((impl) => impl.passed)
      comparison.consensusResult = passResults.every((pass) => pass === passResults[0])

      // Calculate difficulty score
      const failureRate =
        (comparison.implementations.filter((impl) => !impl.passed).length /
          comparison.implementations.length) *
        100
      comparison.difficultyScore = failureRate + (comparison.performanceVariance / avgTime) * 50
    })

    return Array.from(testMap.values())
  }, [testResults, categorizeTest])

  // Calculate performance impact analysis
  const performanceImpacts = useMemo(() => {
    return comparisonResults.map((comparison) => {
      const times = comparison.implementations.map((impl) => impl.executionTime)
      const baselineTime = Math.min(...times)

      const impacts = comparison.implementations.map((impl) => {
        const impactMagnitude = ((impl.executionTime - baselineTime) / baselineTime) * 100
        let impact: 'positive' | 'negative' | 'neutral' = 'neutral'

        if (impactMagnitude > 20) impact = 'negative'
        else if (impactMagnitude < -10) impact = 'positive'

        return {
          language: impl.language,
          executionTime: impl.executionTime,
          impact,
          impactMagnitude: Math.abs(impactMagnitude),
        }
      })

      const avgImpact = impacts.reduce((sum, imp) => sum + imp.impactMagnitude, 0) / impacts.length
      let overallImpact: 'high' | 'medium' | 'low' = 'low'
      if (avgImpact > 50) overallImpact = 'high'
      else if (avgImpact > 20) overallImpact = 'medium'

      return {
        testName: comparison.testName,
        baselineTime,
        implementations: impacts,
        overallImpact,
      }
    })
  }, [comparisonResults])

  // Generate implementation profiles
  const implementationProfiles = useMemo(() => {
    const profiles = new Map<string, ImplementationProfile>()

    implementations.forEach((impl) => {
      const testCases = comparisonResults.filter((cr) =>
        cr.implementations.some((imp) => imp.language === impl.language),
      )

      const strengths: string[] = []
      const weaknesses: string[] = []

      // Analyze performance
      const avgTime =
        testCases.reduce((sum, tc) => {
          const implResult = tc.implementations.find((imp) => imp.language === impl.language)
          return sum + (implResult?.executionTime || 0)
        }, 0) / testCases.length

      let performanceCategory: 'fast' | 'medium' | 'slow' = 'medium'
      if (avgTime < 10) {
        performanceCategory = 'fast'
        strengths.push('Fast execution')
      } else if (avgTime > 50) {
        performanceCategory = 'slow'
        weaknesses.push('Slow execution')
      }

      // Analyze reliability
      const passRate = impl.pass_rate
      if (passRate > 90) strengths.push('High reliability')
      else if (passRate < 70) weaknesses.push('Low reliability')

      // Analyze by category
      const categories = ['math', 'string', 'collection', 'logic']
      categories.forEach((category) => {
        const categoryTests = testCases.filter((tc) => tc.category === category)
        if (categoryTests.length > 0) {
          const categoryPassRate =
            (categoryTests.filter(
              (tc) => tc.implementations.find((imp) => imp.language === impl.language)?.passed,
            ).length /
              categoryTests.length) *
            100

          if (categoryPassRate > 95) strengths.push(`Excellent ${category} support`)
          else if (categoryPassRate < 50) weaknesses.push(`Poor ${category} support`)
        }
      })

      profiles.set(impl.language, {
        language: impl.language,
        strengths,
        weaknesses,
        performanceCategory,
        reliabilityScore: passRate,
        consistencyScore: 100 - (impl.error_count / impl.total_tests) * 100,
        coverageScore: (impl.passed_tests / impl.total_tests) * 100,
      })
    })

    return Array.from(profiles.values())
  }, [implementations, comparisonResults])

  // Helper function
  function categorizeTest(testName: string): string {
    const name = testName.toLowerCase()
    if (name.includes('math') || name.includes('abs') || name.includes('round')) return 'math'
    if (name.includes('string') || name.includes('substring')) return 'string'
    if (name.includes('distinct') || name.includes('skip') || name.includes('collection'))
      return 'collection'
    if (name.includes('where') || name.includes('select') || name.includes('logic')) return 'logic'
    return 'other'
  }

  // Filter results based on selected implementations and test cases
  const filteredResults = useMemo(() => {
    let filtered = comparisonResults

    if (selectedImplementations.length > 0) {
      filtered = filtered.filter((result) =>
        result.implementations.some((impl) => selectedImplementations.includes(impl.language)),
      )
    }

    if (selectedTestCases.length > 0) {
      filtered = filtered.filter((result) => selectedTestCases.includes(result.testName))
    }

    if (showOnlyDifferences) {
      filtered = filtered.filter((result) => !result.consensusResult)
    }

    return filtered
  }, [comparisonResults, selectedImplementations, selectedTestCases, showOnlyDifferences])

  return (
    <Stack gap="xl">
      {/* Header with controls */}
      <Group justify="space-between">
        <Title order={3}>Test Case Comparison</Title>
        <Group>
          <MultiSelect
            placeholder="Select implementations"
            value={selectedImplementations}
            onChange={setSelectedImplementations}
            data={implementations.map((impl) => ({ value: impl.language, label: impl.name }))}
            w={250}
            maxDropdownHeight={200}
          />
          <Select
            placeholder="Comparison mode"
            value={comparisonMode}
            onChange={(value) => setComparisonMode(value || 'side-by-side')}
            data={[
              { value: 'side-by-side', label: 'Side by Side' },
              { value: 'overlay', label: 'Overlay' },
              { value: 'diff', label: 'Difference View' },
            ]}
            w={150}
          />
          <Switch
            label="Show only differences"
            checked={showOnlyDifferences}
            onChange={(event) => setShowOnlyDifferences(event.currentTarget.checked)}
          />
        </Group>
      </Group>

      {/* Summary metrics */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {filteredResults.length}
              </Text>
              <Text size="sm" c="dimmed">
                Test Cases
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg">
              <IconGitCompare size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {filteredResults.filter((r) => !r.consensusResult).length}
              </Text>
              <Text size="sm" c="dimmed">
                Disagreements
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="red">
              <IconAlertTriangle size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {Math.round(
                  filteredResults.reduce((sum, r) => sum + r.performanceVariance, 0) /
                    filteredResults.length,
                ) || 0}
                ms
              </Text>
              <Text size="sm" c="dimmed">
                Avg Variance
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="orange">
              <IconTrendingUp size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="lg" fw={700}>
                {performanceImpacts.filter((p) => p.overallImpact === 'high').length}
              </Text>
              <Text size="sm" c="dimmed">
                High Impact
              </Text>
            </div>
            <ThemeIcon variant="light" size="lg" color="purple">
              <IconBolt size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main comparison tabs */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'comparison-matrix')}>
        <Tabs.List>
          <Tabs.Tab value="comparison-matrix" leftSection={<IconGitCompare size={16} />}>
            Comparison Matrix
          </Tabs.Tab>
          <Tabs.Tab value="performance-impact" leftSection={<IconBolt size={16} />}>
            Performance Impact
          </Tabs.Tab>
          <Tabs.Tab value="implementation-profiles" leftSection={<IconChartRadar size={16} />}>
            Implementation Profiles
          </Tabs.Tab>
          <Tabs.Tab value="detailed-analysis" leftSection={<IconEye size={16} />}>
            Detailed Analysis
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="comparison-matrix" pt="md">
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="md">
              <Group justify="space-between">
                <Title order={4}>Test Results Comparison Matrix</Title>
                <Group>
                  <Badge variant="light">{filteredResults.length} tests</Badge>
                  <Button variant="light" size="sm" leftSection={<IconDownload size={14} />}>
                    Export
                  </Button>
                </Group>
              </Group>
            </Card.Section>

            <Card.Section>
              <ScrollArea h={500}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Test Case</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th>Consensus</Table.Th>
                      <Table.Th>Performance Variance</Table.Th>
                      <Table.Th>Difficulty</Table.Th>
                      {implementations.slice(0, 5).map((impl) => (
                        <Table.Th key={impl.language}>{impl.language}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredResults.slice(0, 20).map((result) => (
                      <Table.Tr key={result.testName}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {result.testName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="outline">
                            {result.category}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {result.consensusResult ? (
                              <IconCheck size={16} color="green" />
                            ) : (
                              <IconX size={16} color="red" />
                            )}
                            <Text size="sm" c={result.consensusResult ? 'green' : 'red'}>
                              {result.consensusResult ? 'Yes' : 'No'}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c={result.performanceVariance > 50 ? 'red' : 'green'}>
                            {result.performanceVariance.toFixed(1)}ms
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            color={
                              result.difficultyScore > 70
                                ? 'red'
                                : result.difficultyScore > 40
                                  ? 'orange'
                                  : 'green'
                            }
                          >
                            {Math.round(result.difficultyScore)}
                          </Badge>
                        </Table.Td>
                        {implementations.slice(0, 5).map((impl) => {
                          const implResult = result.implementations.find(
                            (ir) => ir.language === impl.language,
                          )
                          return (
                            <Table.Td key={impl.language}>
                              {implResult ? (
                                <Group gap="xs">
                                  {implResult.passed ? (
                                    <IconCheck size={14} color="green" />
                                  ) : (
                                    <IconX size={14} color="red" />
                                  )}
                                  <Text size="xs" c="dimmed">
                                    {implResult.executionTime.toFixed(1)}ms
                                  </Text>
                                </Group>
                              ) : (
                                <Text size="xs" c="dimmed">
                                  N/A
                                </Text>
                              )}
                            </Table.Td>
                          )
                        })}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="performance-impact" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Performance Impact Distribution</Title>
              </Card.Section>

              <Card.Section p="md">
                <BarChart
                  data={[
                    {
                      impact: 'High',
                      count: performanceImpacts.filter((p) => p.overallImpact === 'high').length,
                    },
                    {
                      impact: 'Medium',
                      count: performanceImpacts.filter((p) => p.overallImpact === 'medium').length,
                    },
                    {
                      impact: 'Low',
                      count: performanceImpacts.filter((p) => p.overallImpact === 'low').length,
                    },
                  ]}
                  dataKey="impact"
                  series={[{ name: 'count', color: 'blue' }]}
                  h={300}
                  withTooltip
                />
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Implementation Performance Comparison</Title>
              </Card.Section>

              <Card.Section p="md">
                <BarChart
                  data={implementations.map((impl) => ({
                    implementation: impl.language,
                    avgTime: impl.avg_execution_time,
                    passRate: impl.pass_rate,
                  }))}
                  dataKey="implementation"
                  series={[{ name: 'avgTime', color: 'blue', label: 'Avg Time (ms)' }]}
                  h={300}
                  withTooltip
                  withLegend
                />
              </Card.Section>
            </Card>
          </SimpleGrid>

          <Card withBorder mt="xl">
            <Card.Section withBorder inheritPadding py="md">
              <Title order={4}>High Impact Test Cases</Title>
            </Card.Section>

            <Card.Section p="md">
              <ScrollArea h={400}>
                <Stack gap="md">
                  {performanceImpacts
                    .filter((p) => p.overallImpact === 'high')
                    .slice(0, 10)
                    .map((impact) => (
                      <Group
                        key={impact.testName}
                        justify="space-between"
                        p="md"
                        style={{
                          border: '1px solid var(--mantine-color-red-3)',
                          borderRadius: '8px',
                          backgroundColor: 'var(--mantine-color-red-0)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Group mb="xs">
                            <Text fw={500}>{impact.testName}</Text>
                            <Badge color="red" variant="light">
                              {impact.overallImpact} impact
                            </Badge>
                          </Group>

                          <Grid>
                            <Grid.Col span={3}>
                              <Text size="sm" c="dimmed">
                                Baseline
                              </Text>
                              <Text size="sm" fw={500}>
                                {impact.baselineTime.toFixed(1)}ms
                              </Text>
                            </Grid.Col>
                            <Grid.Col span={9}>
                              <Text size="sm" c="dimmed">
                                Implementation Impact
                              </Text>
                              <Group gap="xs">
                                {impact.implementations.slice(0, 4).map((impl) => (
                                  <Badge
                                    key={impl.language}
                                    size="sm"
                                    color={
                                      impl.impact === 'positive'
                                        ? 'green'
                                        : impl.impact === 'negative'
                                          ? 'red'
                                          : 'gray'
                                    }
                                  >
                                    {impl.language}: {impl.impactMagnitude.toFixed(0)}%
                                  </Badge>
                                ))}
                              </Group>
                            </Grid.Col>
                          </Grid>
                        </div>
                      </Group>
                    ))}

                  {performanceImpacts.filter((p) => p.overallImpact === 'high').length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                      No high impact test cases detected
                    </Text>
                  )}
                </Stack>
              </ScrollArea>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="implementation-profiles" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            {implementationProfiles.slice(0, 4).map((profile) => (
              <Card key={profile.language} withBorder>
                <Card.Section withBorder inheritPadding py="md">
                  <Group justify="space-between">
                    <Title order={4}>{profile.language}</Title>
                    <Badge
                      color={
                        profile.performanceCategory === 'fast'
                          ? 'green'
                          : profile.performanceCategory === 'slow'
                            ? 'red'
                            : 'yellow'
                      }
                    >
                      {profile.performanceCategory}
                    </Badge>
                  </Group>
                </Card.Section>

                <Card.Section p="md">
                  <Stack gap="md">
                    {/* Metrics */}
                    <Grid>
                      <Grid.Col span={4}>
                        <Text size="sm" c="dimmed">
                          Reliability
                        </Text>
                        <Progress value={profile.reliabilityScore} color="green" size="sm" />
                        <Text size="xs">{Math.round(profile.reliabilityScore)}%</Text>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Text size="sm" c="dimmed">
                          Consistency
                        </Text>
                        <Progress value={profile.consistencyScore} color="blue" size="sm" />
                        <Text size="xs">{Math.round(profile.consistencyScore)}%</Text>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Text size="sm" c="dimmed">
                          Coverage
                        </Text>
                        <Progress value={profile.coverageScore} color="orange" size="sm" />
                        <Text size="xs">{Math.round(profile.coverageScore)}%</Text>
                      </Grid.Col>
                    </Grid>

                    {/* Strengths */}
                    <div>
                      <Text size="sm" fw={500} c="green" mb="xs">
                        Strengths
                      </Text>
                      <Stack gap="xs">
                        {profile.strengths.map((strength, index) => (
                          <Group key={index} gap="xs">
                            <IconCheck size={14} color="green" />
                            <Text size="sm">{strength}</Text>
                          </Group>
                        ))}
                        {profile.strengths.length === 0 && (
                          <Text size="sm" c="dimmed">
                            No specific strengths identified
                          </Text>
                        )}
                      </Stack>
                    </div>

                    {/* Weaknesses */}
                    <div>
                      <Text size="sm" fw={500} c="red" mb="xs">
                        Areas for Improvement
                      </Text>
                      <Stack gap="xs">
                        {profile.weaknesses.map((weakness, index) => (
                          <Group key={index} gap="xs">
                            <IconAlertTriangle size={14} color="red" />
                            <Text size="sm">{weakness}</Text>
                          </Group>
                        ))}
                        {profile.weaknesses.length === 0 && (
                          <Text size="sm" c="dimmed">
                            No significant weaknesses identified
                          </Text>
                        )}
                      </Stack>
                    </div>
                  </Stack>
                </Card.Section>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="detailed-analysis" pt="md">
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="md">
              <Group justify="space-between">
                <Title order={4}>Detailed Test Case Analysis</Title>
                <Group>
                  <Select
                    placeholder="Select test case"
                    data={filteredResults
                      .slice(0, 20)
                      .map((r) => ({ value: r.testName, label: r.testName }))}
                    w={300}
                  />
                  <Button variant="light" size="sm" leftSection={<IconSearch size={14} />}>
                    Analyze
                  </Button>
                </Group>
              </Group>
            </Card.Section>

            <Card.Section p="md">
              {filteredResults.length > 0 ? (
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                  Select a test case above to view detailed cross-implementation analysis including
                  actual vs expected results, error messages, and performance characteristics.
                </Alert>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No test cases available for detailed analysis
                </Text>
              )}
            </Card.Section>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
