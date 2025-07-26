import { Container, Text, Title } from '@mantine/core'

export default function DashboardPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">
        Performance Dashboard
      </Title>
      <Text>Performance metrics and comparisons will be displayed here.</Text>
    </Container>
  )
}
