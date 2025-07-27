import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { loadImplementations } from '@shared/api'
import type { ImplementationInfo, ImplementationsConfig } from '@shared/lib'
import {
  IconBook,
  IconBrandGithub,
  IconCode,
  IconCpu,
  IconRefresh,
  IconRocket,
  IconTools,
  IconUser,
} from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'

interface ImplementationCardProps {
  implementation: ImplementationInfo
}

function ImplementationCard({ implementation }: ImplementationCardProps) {
  const getPerformanceBadgeColor = (category: string) => {
    switch (category) {
      case 'high':
        return 'green'
      case 'medium':
        return 'yellow'
      case 'low':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green'
      case 'experimental':
        return 'blue'
      case 'deprecated':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            {implementation.icon ? (
              <img
                src={implementation.icon}
                alt={`${implementation.language} icon`}
                style={{ width: 24, height: 24 }}
              />
            ) : (
              <IconCode size={24} color="var(--mantine-color-blue-6)" />
            )}
            <div>
              <Title order={3}>{implementation.name}</Title>
              <Text size="sm" c="dimmed">
                {implementation.library
                  ? `${implementation.library} v${implementation.version}`
                  : `v${implementation.version}`}
              </Text>
            </div>
          </Group>
          <Group>
            <Badge color={getStatusBadgeColor(implementation.status)} variant="light">
              {implementation.status}
            </Badge>
            <Badge
              color={getPerformanceBadgeColor(implementation.performance.category)}
              variant="filled"
            >
              {implementation.performance.category} performance
            </Badge>
          </Group>
        </Group>

        {/* Description */}
        <Text size="sm">{implementation.description}</Text>

        {/* Maintainer */}
        <Group gap="xs">
          <IconUser size={16} />
          <Text size="sm" fw={500}>
            Maintained by:
          </Text>
          <Badge variant="outline" color="blue" size="sm">
            {implementation.maintainer}
          </Badge>
        </Group>

        {/* Technical Details */}
        <SimpleGrid cols={2} spacing="xs">
          <Group gap="xs">
            <IconCpu size={16} />
            <Text size="sm">
              <strong>Runtime:</strong> {implementation.runtime}
            </Text>
          </Group>
          <Group gap="xs">
            <IconTools size={16} />
            <Text size="sm">
              <strong>Build:</strong> {implementation.buildSystem}
            </Text>
          </Group>
        </SimpleGrid>

        {/* Features */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Key Features:
          </Text>
          <Group gap="xs">
            {implementation.features.slice(0, 3).map((feature) => (
              <Badge key={feature} variant="outline" size="sm">
                {feature}
              </Badge>
            ))}
            {implementation.features.length > 3 && (
              <Badge variant="outline" size="sm" c="dimmed">
                +{implementation.features.length - 3} more
              </Badge>
            )}
          </Group>
        </div>

        {/* Performance Insights */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Performance Highlights:
          </Text>
          <Stack gap="xs">
            <Group gap="xs">
              <IconRocket size={14} color="green" />
              <Text size="xs">
                <strong>Strengths:</strong> {implementation.performance.strengths.join(', ')}
              </Text>
            </Group>
            {implementation.performance.considerations.length > 0 && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  <strong>Considerations:</strong>{' '}
                  {implementation.performance.considerations.join(', ')}
                </Text>
              </Group>
            )}
          </Stack>
        </div>

        {/* Dependencies */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Key Dependencies:
          </Text>
          <Group gap="xs">
            {implementation.dependencies.slice(0, 2).map((dep) => (
              <Badge key={dep} variant="light" size="sm" color="gray">
                {dep}
              </Badge>
            ))}
            {implementation.dependencies.length > 2 && (
              <Badge variant="light" size="sm" color="gray">
                +{implementation.dependencies.length - 2} more
              </Badge>
            )}
          </Group>
        </div>

        {/* Actions */}
        <Group justify="space-between" mt="md">
          <Group>
            <Tooltip label="View Repository">
              <ActionIcon
                variant="light"
                component="a"
                href={implementation.repository}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconBrandGithub size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="View Documentation">
              <ActionIcon
                variant="light"
                component="a"
                href={implementation.documentation}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconBook size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text size="xs" c="dimmed">
            Updated: {new Date(implementation.lastUpdated).toLocaleDateString()}
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}

export default function ImplementationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ImplementationsConfig | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const implementationsConfig = await loadImplementations()
      setConfig(implementationsConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load implementations data')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = async () => {
    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading implementations...</Text>
        </Group>
      </Container>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Error loading implementations">
          {error}
        </Alert>
      </Container>
    )
  }

  if (!config) {
    return (
      <Container size="xl" py="xl">
        <Alert color="yellow" title="No implementations found">
          No implementation data available.
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>FHIRPath Implementations</Title>
          <Text c="dimmed" mt="xs">
            Explore {config.metadata.totalImplementations} different FHIRPath implementations across
            various programming languages and runtimes.
          </Text>
        </div>
        <Tooltip label="Refresh data">
          <ActionIcon variant="light" onClick={handleRefresh} loading={loading}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Statistics */}
      <Group mb="xl">
        <Badge variant="light" size="lg">
          {config.metadata.totalImplementations} Implementations
        </Badge>
        <Badge variant="light" size="lg" color="green">
          {config.metadata.categories.high.length} High Performance
        </Badge>
        <Badge variant="light" size="lg" color="yellow">
          {config.metadata.categories.medium.length} Medium Performance
        </Badge>
        <Badge variant="light" size="lg" color="blue">
          {Object.keys(config.metadata.runtimes).length} Different Runtimes
        </Badge>
      </Group>

      {/* Implementation Cards */}
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
        {config.implementations.map((implementation) => (
          <ImplementationCard key={implementation.id} implementation={implementation} />
        ))}
      </SimpleGrid>

      {/* Footer Info */}
      <Group justify="center" mt="xl" pt="xl">
        <Text size="sm" c="dimmed">
          Last updated: {new Date(config.metadata.lastUpdated).toLocaleDateString()}
        </Text>
      </Group>
    </Container>
  )
}
