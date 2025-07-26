import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft, IconHome } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Container size="sm" py="xl">
      <Stack
        align="center"
        gap="xl"
        style={{ textAlign: 'center', minHeight: '60vh', justifyContent: 'center' }}
      >
        <div>
          <Title order={1} size="6rem" fw={900} c="dimmed" mb="xs">
            404
          </Title>
          <Title order={2} size="2rem" mb="md">
            Page Not Found
          </Title>
          <Text size="lg" c="dimmed" mb="xl">
            The page you're looking for doesn't exist or has been moved.
          </Text>
        </div>

        <Group justify="center">
          <Button
            variant="filled"
            size="md"
            leftSection={<IconHome size={20} />}
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="subtle"
            size="md"
            leftSection={<IconArrowLeft size={20} />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </Group>

        <Text size="sm" c="dimmed">
          If you believe this is an error, please contact the development team.
        </Text>
      </Stack>
    </Container>
  )
}
