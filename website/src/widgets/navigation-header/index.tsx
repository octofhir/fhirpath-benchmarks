import {
  Badge,
  Box,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBrandGithub,
  IconChartBar,
  IconCode,
  IconDashboard,
  IconTestPipe,
} from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'

export function NavigationHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [opened, { open, close }] = useDisclosure(false)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path)

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: IconDashboard,
      description: 'Overview of all implementations',
    },
    {
      label: 'Implementations',
      path: '/implementations',
      icon: IconCode,
      description: 'Explore FHIRPath implementations',
    },
    {
      label: 'Test Explorer',
      path: '/tests',
      icon: IconTestPipe,
      description: 'Browse and analyze test cases',
    },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    close()
  }

  return (
    <>
      <Paper withBorder shadow="sm" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Container size="xl" py="md">
          <Group justify="space-between">
            {/* Logo/Brand */}
            <Group>
              <IconChartBar size={28} color="var(--mantine-color-blue-6)" />
              <Box>
                <Title
                  order={3}
                  onClick={() => navigate('/')}
                  style={{
                    cursor: 'pointer',
                    color: 'var(--mantine-color-blue-6)',
                    lineHeight: 1,
                  }}
                >
                  FHIRPath Benchmarks
                </Title>
                <Text size="xs" c="dimmed">
                  Performance Analysis & Testing
                </Text>
              </Box>
            </Group>

            {/* Desktop Navigation */}
            <Group visibleFrom="sm">
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'filled' : 'subtle'}
                  leftSection={<item.icon size={16} />}
                  onClick={() => handleNavigation(item.path)}
                >
                  {item.label}
                </Button>
              ))}

              <Divider orientation="vertical" />

              <Button
                variant="subtle"
                leftSection={<IconBrandGithub size={16} />}
                component="a"
                href="https://github.com/octofhir/fhirpath-benchmarks"
                target="_blank"
              >
                GitHub
              </Button>
            </Group>

            {/* Mobile Menu Burger */}
            <Burger opened={opened} onClick={open} hiddenFrom="sm" />
          </Group>
        </Container>
      </Paper>

      {/* Mobile Navigation Drawer */}
      <Drawer opened={opened} onClose={close} title="Navigation" position="right">
        <Stack gap="md">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? 'filled' : 'subtle'}
              leftSection={<item.icon size={16} />}
              onClick={() => handleNavigation(item.path)}
              justify="start"
              fullWidth
            >
              <Box>
                <Text fw={500}>{item.label}</Text>
                <Text size="xs" c="dimmed">
                  {item.description}
                </Text>
              </Box>
            </Button>
          ))}

          <Divider />

          <Button
            variant="subtle"
            leftSection={<IconBrandGithub size={16} />}
            component="a"
            href="https://github.com/octofhir/fhirpath-benchmarks"
            target="_blank"
            justify="start"
            fullWidth
          >
            View on GitHub
          </Button>

          <Box pt="md">
            <Badge variant="light" color="blue" fullWidth>
              FHIRPath Performance Testing
            </Badge>
          </Box>
        </Stack>
      </Drawer>
    </>
  )
}
