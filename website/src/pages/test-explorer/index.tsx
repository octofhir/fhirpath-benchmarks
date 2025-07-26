import {
  Badge,
  Button,
  Card,
  Code,
  Collapse,
  Container,
  Grid,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { FilterOptions, TestCase } from '@shared/lib'
import { IconChevronDown, IconChevronUp, IconSearch } from '@tabler/icons-react'
import { FiltersPanel } from '@widgets/filters-panel'
import { useEffect, useState } from 'react'

// Mock test cases for demonstration
const mockTestCases: TestCase[] = [
  {
    name: 'testSimple',
    description: 'Basic name.given path navigation',
    expression: 'name.given',
    expected: ['Peter', 'James', 'Jim'],
    tags: ['fhirpath-lab', 'testBasics'],
    category: 'Navigation',
    complexity: 'low',
    input_file: 'patient-example.json',
  },
  {
    name: 'testArithmetic',
    description: 'Basic arithmetic operations',
    expression: '1 + 2',
    expected: [3],
    tags: ['arithmetic', 'math'],
    category: 'Arithmetic',
    complexity: 'low',
  },
  {
    name: 'testLogicalAnd',
    description: 'Logical AND operation',
    expression: 'true and false',
    expected: [false],
    tags: ['logic', 'boolean'],
    category: 'Logic',
    complexity: 'medium',
  },
  {
    name: 'testComplexPath',
    description: 'Complex path navigation with filtering',
    expression: 'Bundle.entry.resource.where($this is Patient).name.given',
    expected: ['Alice', 'Bob'],
    tags: ['complex', 'filtering'],
    category: 'Navigation',
    complexity: 'high',
    input_file: 'bundle-example.json',
  },
]

const ITEMS_PER_PAGE = 10

export default function TestExplorerPage() {
  const [testCases] = useState<TestCase[]>(mockTestCases)
  const [filteredTestCases, setFilteredTestCases] = useState<TestCase[]>(mockTestCases)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('name')
  const [expandedTest, setExpandedTest] = useState<string | null>(null)

  // Available filter options
  const availableLanguages = ['javascript', 'python', 'java', 'rust', 'go', 'csharp']
  const availableCategories = [
    'Navigation',
    'Arithmetic',
    'Logic',
    'String',
    'Collections',
    'Functions',
  ]
  const availableTags = [
    'fhirpath-lab',
    'testBasics',
    'arithmetic',
    'logic',
    'complex',
    'filtering',
  ]

  useEffect(() => {
    applyFilters()
  }, [filters, searchTerm, sortBy, testCases])

  const applyFilters = () => {
    let filtered = [...testCases]

    // Apply text search
    if (searchTerm) {
      filtered = filtered.filter(
        (test) =>
          test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.expression.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(
        (test) => test.category && filters.categories!.includes(test.category),
      )
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(
        (test) => test.tags && test.tags.some((tag) => filters.tags!.includes(tag)),
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'complexity': {
          const complexityOrder = { low: 1, medium: 2, high: 3 }
          return (
            (complexityOrder[a.complexity || 'low'] || 1) -
            (complexityOrder[b.complexity || 'low'] || 1)
          )
        }
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        default:
          return 0
      }
    })

    setFilteredTestCases(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const paginatedTestCases = filteredTestCases.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const totalPages = Math.ceil(filteredTestCases.length / ITEMS_PER_PAGE)

  const toggleTestDetails = (testName: string) => {
    setExpandedTest(expandedTest === testName ? null : testName)
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        Test Case Explorer
      </Title>

      <Grid>
        {/* Filters Sidebar */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <FiltersPanel
            onFiltersChange={setFilters}
            availableLanguages={availableLanguages}
            availableCategories={availableCategories}
            availableTags={availableTags}
          />
        </Grid.Col>

        {/* Main Content */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="md">
            {/* Search and Sort Controls */}
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <TextInput
                  placeholder="Search test cases..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 400 }}
                />
                <Select
                  label="Sort by"
                  value={sortBy}
                  onChange={(value) => setSortBy(value || 'name')}
                  data={[
                    { value: 'name', label: 'Name' },
                    { value: 'category', label: 'Category' },
                    { value: 'complexity', label: 'Complexity' },
                  ]}
                  style={{ minWidth: 120 }}
                />
              </Group>

              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Showing {paginatedTestCases.length} of {filteredTestCases.length} test cases
                </Text>
                {totalPages > 1 && (
                  <Pagination
                    total={totalPages}
                    value={currentPage}
                    onChange={setCurrentPage}
                    size="sm"
                  />
                )}
              </Group>
            </Card>

            {/* Test Cases List */}
            {
              <Stack gap="sm">
                {paginatedTestCases.map((testCase) => (
                  <Card key={testCase.name} withBorder>
                    <Group justify="space-between" mb="md">
                      <Group>
                        <Text fw={500} size="lg">
                          {testCase.name}
                        </Text>
                        {testCase.category && (
                          <Badge color="blue" variant="light">
                            {testCase.category}
                          </Badge>
                        )}
                        {testCase.complexity && (
                          <Badge
                            color={
                              testCase.complexity === 'low'
                                ? 'green'
                                : testCase.complexity === 'medium'
                                  ? 'yellow'
                                  : 'red'
                            }
                            variant="light"
                          >
                            {testCase.complexity}
                          </Badge>
                        )}
                      </Group>
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => toggleTestDetails(testCase.name)}
                        rightSection={
                          expandedTest === testCase.name ? (
                            <IconChevronUp size={14} />
                          ) : (
                            <IconChevronDown size={14} />
                          )
                        }
                      >
                        {expandedTest === testCase.name ? 'Hide' : 'Show'} Details
                      </Button>
                    </Group>

                    {testCase.description && (
                      <Text size="sm" c="dimmed" mb="md">
                        {testCase.description}
                      </Text>
                    )}

                    <Group mb="md">
                      <Text size="sm" fw={500}>
                        Expression:
                      </Text>
                      <Code>{testCase.expression}</Code>
                    </Group>

                    {testCase.tags && testCase.tags.length > 0 && (
                      <Group gap="xs" mb="md">
                        <Text size="sm" fw={500}>
                          Tags:
                        </Text>
                        {testCase.tags.map((tag) => (
                          <Badge key={tag} size="xs" variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </Group>
                    )}

                    <Collapse in={expandedTest === testCase.name}>
                      <Stack gap="md" mt="md">
                        <div>
                          <Text size="sm" fw={500} mb="xs">
                            Expected Result:
                          </Text>
                          <Code block>{JSON.stringify(testCase.expected, null, 2)}</Code>
                        </div>

                        {testCase.input_file && (
                          <div>
                            <Text size="sm" fw={500} mb="xs">
                              Input File:
                            </Text>
                            <Text size="sm" c="blue">
                              {testCase.input_file}
                            </Text>
                          </div>
                        )}

                        {/* Implementation Results Table */}
                        <div>
                          <Text size="sm" fw={500} mb="xs">
                            Results Across Implementations:
                          </Text>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Implementation</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Execution Time</Table.Th>
                                <Table.Th>Result</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {availableLanguages.slice(0, 3).map((lang) => (
                                <Table.Tr key={lang}>
                                  <Table.Td>{lang}</Table.Td>
                                  <Table.Td>
                                    <Badge
                                      color={Math.random() > 0.2 ? 'green' : 'red'}
                                      variant="light"
                                      size="sm"
                                    >
                                      {Math.random() > 0.2 ? 'Pass' : 'Fail'}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>{(Math.random() * 50 + 5).toFixed(1)}ms</Table.Td>
                                  <Table.Td>
                                    <Code>
                                      {Math.random() > 0.2
                                        ? JSON.stringify(testCase.expected)
                                        : 'Error'}
                                    </Code>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                      </Stack>
                    </Collapse>
                  </Card>
                ))}
              </Stack>
            }

            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination total={totalPages} value={currentPage} onChange={setCurrentPage} />
              </Group>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  )
}
