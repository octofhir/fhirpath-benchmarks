import { Button, Container, Group } from '@mantine/core'
import { useLocation, useNavigate } from 'react-router-dom'

export function NavigationHeader() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <Container size="xl" py="md">
      <Group justify="space-between">
        <Button
          variant="subtle"
          size="lg"
          onClick={() => navigate('/')}
          styles={{ root: { fontSize: '1.2rem', fontWeight: 600 } }}
        >
          FHIRPath Benchmarks
        </Button>
        <Group>
          <Button
            variant={isActive('/dashboard') ? 'filled' : 'subtle'}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant={isActive('/tests') ? 'filled' : 'subtle'}
            onClick={() => navigate('/tests')}
          >
            Test Explorer
          </Button>
        </Group>
      </Group>
    </Container>
  )
}
