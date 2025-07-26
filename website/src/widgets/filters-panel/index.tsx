import {
  Button,
  Card,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core'
import type { FilterOptions } from '@shared/lib'
import { IconFilter, IconSearch, IconX } from '@tabler/icons-react'
import { useState } from 'react'

interface FiltersPanelProps {
  onFiltersChange: (filters: FilterOptions) => void
  availableLanguages: string[]
  availableCategories: string[]
  availableTags: string[]
}

export function FiltersPanel({
  onFiltersChange,
  availableLanguages,
  availableCategories,
  availableTags,
}: FiltersPanelProps) {
  const [filters, setFilters] = useState<FilterOptions>({})

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const clearFilters = () => {
    const emptyFilters: FilterOptions = {}
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(filters).some(
    (value) =>
      value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true),
  )

  return (
    <Card withBorder>
      <Card.Section withBorder inheritPadding py="md">
        <Group justify="space-between">
          <Group>
            <IconFilter size={16} />
            <Title order={4}>Filters</Title>
          </Group>
          {hasActiveFilters && (
            <Button
              variant="subtle"
              size="xs"
              onClick={clearFilters}
              leftSection={<IconX size={14} />}
            >
              Clear All
            </Button>
          )}
        </Group>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="md">
          {/* Text Search */}
          <TextInput
            label="Search"
            placeholder="Search implementations, tests..."
            leftSection={<IconSearch size={16} />}
            value={filters.text_search || ''}
            onChange={(event) => updateFilters({ text_search: event.currentTarget.value })}
          />

          <Divider />

          {/* Implementation Filters */}
          <MultiSelect
            label="Languages"
            placeholder="Select languages"
            data={availableLanguages.map((lang) => ({
              value: lang,
              label: lang.charAt(0).toUpperCase() + lang.slice(1),
            }))}
            value={filters.implementations || []}
            onChange={(value) => updateFilters({ implementations: value })}
            clearable
            searchable
          />

          <MultiSelect
            label="Categories"
            placeholder="Select test categories"
            data={availableCategories.map((cat) => ({ value: cat, label: cat }))}
            value={filters.categories || []}
            onChange={(value) => updateFilters({ categories: value })}
            clearable
            searchable
          />

          <MultiSelect
            label="Tags"
            placeholder="Select tags"
            data={availableTags.map((tag) => ({ value: tag, label: tag }))}
            value={filters.tags || []}
            onChange={(value) => updateFilters({ tags: value })}
            clearable
            searchable
          />

          <Divider />

          {/* Status Filters */}
          <MultiSelect
            label="Test Status"
            placeholder="Filter by status"
            data={[
              { value: 'passed', label: 'Passed' },
              { value: 'failed', label: 'Failed' },
              { value: 'error', label: 'Error' },
            ]}
            value={filters.status || []}
            onChange={(value) =>
              updateFilters({ status: value as ('passed' | 'failed' | 'error')[] })
            }
            clearable
          />

          <Divider />

          {/* Performance Filters */}
          <Stack gap="xs">
            <Title order={6}>Performance Range (ms)</Title>
            <Group grow>
              <NumberInput
                label="Min"
                placeholder="0"
                min={0}
                value={filters.performance_range?.min || ''}
                onChange={(value) =>
                  updateFilters({
                    performance_range: {
                      min: typeof value === 'number' ? value : 0,
                      max: filters.performance_range?.max || 1000,
                    },
                  })
                }
              />
              <NumberInput
                label="Max"
                placeholder="1000"
                min={0}
                value={filters.performance_range?.max || ''}
                onChange={(value) =>
                  updateFilters({
                    performance_range: {
                      min: filters.performance_range?.min || 0,
                      max: typeof value === 'number' ? value : 1000,
                    },
                  })
                }
              />
            </Group>
          </Stack>
        </Stack>
      </Card.Section>
    </Card>
  )
}
