import { Container, Text, Title } from '@mantine/core'

export default function TestExplorerPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">
        Test Case Explorer
      </Title>
      <Text>Browse and analyze FHIRPath test cases and their results.</Text>
    </Container>
  )
}
