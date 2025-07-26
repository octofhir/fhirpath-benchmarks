import { Container, Text, Title } from '@mantine/core'
import { useParams } from 'react-router-dom'

export default function BenchmarkDetailPage() {
  const { implementation } = useParams<{ implementation: string }>()

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">
        {implementation} Benchmark Details
      </Title>
      <Text>Detailed benchmark results for {implementation} will be displayed here.</Text>
    </Container>
  )
}
