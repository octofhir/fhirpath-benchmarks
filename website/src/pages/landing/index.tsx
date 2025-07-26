import { Button, Container, Group, Text, Title } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        FHIRPath Benchmarking
      </Title>
      <Text mb="xl">
        Compare performance and compliance of different FHIRPath implementations across multiple
        programming languages.
      </Text>
      <Group>
        <Button onClick={() => navigate('/dashboard')}>View Dashboard</Button>
        <Button variant="outline" onClick={() => navigate('/tests')}>
          Explore Tests
        </Button>
      </Group>
    </Container>
  )
}
