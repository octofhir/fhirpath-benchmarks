import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { calculateDashboardStats, clearCache, loadLatestComparisonReport } from '@shared/api'
import type { DashboardStats, ImplementationMetadata } from '@shared/lib'
import {
  formatExecutionTime,
  formatPercentage,
  sortImplementations,
  transformTestResultsToMetadata,
} from '@shared/lib'
import {
  IconChartBar,
  IconClock,
  IconDownload,
  IconRefresh,
  IconTarget,
  IconTrophy,
} from '@tabler/icons-react'
import { PerformanceCharts } from '@widgets/performance-charts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [implementations, setImplementations] = useState<ImplementationMetadata[]>([])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const comparisonReport = await loadLatestComparisonReport()
      const dashboardStats = calculateDashboardStats(comparisonReport)
      const implementationData = transformTestResultsToMetadata(comparisonReport.test_results)

      setStats(dashboardStats)
      setImplementations(sortImplementations(implementationData, 'pass_rate'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    clearCache()
    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading dashboard data...</Text>
        </Group>
      </Container>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Error loading dashboard">
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>FHIRPath Performance Dashboard</Title>
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

      {/* Statistics Cards */}
      {stats && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconChartBar size={24} color="blue" />
                <Badge variant="light" color="blue">
                  Total
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {stats.total_implementations}
              </Text>
              <Text size="sm" c="dimmed">
                Implementations
              </Text>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconTarget size={24} color="green" />
                <Badge variant="light" color="green">
                  Tests
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {stats.total_test_cases}
              </Text>
              <Text size="sm" c="dimmed">
                Test Cases
              </Text>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconTrophy size={24} color="orange" />
                <Badge variant="light" color="orange">
                  Pass Rate
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {formatPercentage(stats.overall_pass_rate)}
              </Text>
              <Text size="sm" c="dimmed">
                Overall Success
              </Text>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <IconClock size={24} color="purple" />
                <Badge variant="light" color="purple">
                  Updated
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {new Date(stats.last_benchmark_run).toLocaleDateString()}
              </Text>
              <Text size="sm" c="dimmed">
                Last Run
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>
      )}

      {/* Implementation Comparison Table */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="md">
          <Group justify="space-between">
            <Title order={3}>Implementation Comparison</Title>
            <Badge variant="light">{implementations.length} implementations</Badge>
          </Group>
        </Card.Section>

        <Card.Section>
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Implementation</Table.Th>
                  <Table.Th>Language</Table.Th>
                  <Table.Th>Pass Rate</Table.Th>
                  <Table.Th>Avg Execution Time</Table.Th>
                  <Table.Th>Tests Passed</Table.Th>
                  <Table.Th>Tests Failed</Table.Th>
                  <Table.Th>Errors</Table.Th>
                  <Table.Th>Last Updated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {implementations.map((impl) => (
                  <Table.Tr
                    key={impl.language}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/benchmarks/${impl.language}`)}
                  >
                    <Table.Td>
                      <Text fw={500} c="blue" style={{ textDecoration: 'underline' }}>
                        {impl.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        {impl.language}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          impl.pass_rate >= 90 ? 'green' : impl.pass_rate >= 70 ? 'yellow' : 'red'
                        }
                        variant="light"
                      >
                        {formatPercentage(impl.pass_rate)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={impl.avg_execution_time < 50 ? 'green' : 'orange'}>
                        {formatExecutionTime(impl.avg_execution_time)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="green" fw={500}>
                        {impl.passed_tests}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="red" fw={500}>
                        {impl.failed_tests}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="orange" fw={500}>
                        {impl.error_count}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(impl.last_updated).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card.Section>
      </Card>

      {/* Performance Charts */}
      <Card withBorder mt="xl">
        <Card.Section withBorder inheritPadding py="md">
          <Title order={3}>Performance Analytics</Title>
        </Card.Section>

        <Card.Section p="md">
          <PerformanceCharts implementations={implementations} />
        </Card.Section>
      </Card>

      {/* Quick Stats Summary */}
      {stats && (
        <Grid mt="xl">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Best Performers</Title>
              </Card.Section>
              <Stack gap="md" p="md">
                <Group justify="space-between">
                  <Text>Fastest Implementation:</Text>
                  <Badge color="blue">{stats.fastest_implementation}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text>Most Compliant:</Text>
                  <Badge color="green">{stats.most_compliant_implementation}</Badge>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="md">
                <Title order={4}>Summary Statistics</Title>
              </Card.Section>
              <Stack gap="md" p="md">
                <Group justify="space-between">
                  <Text>Total Implementations:</Text>
                  <Text fw={500}>{stats.total_implementations}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Total Test Cases:</Text>
                  <Text fw={500}>{stats.total_test_cases}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Overall Pass Rate:</Text>
                  <Text fw={500} c="green">
                    {formatPercentage(stats.overall_pass_rate)}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      )}
    </Container>
  )
}
