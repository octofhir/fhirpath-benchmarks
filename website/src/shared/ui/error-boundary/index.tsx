import { Alert, Button, Code, Container, Stack, Text, Title } from '@mantine/core'
import { IconBug, IconRefresh } from '@tabler/icons-react'
import type React from 'react'
import type { ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to monitoring service in production
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Container size="sm" py="xl">
          <Stack
            gap="lg"
            style={{ textAlign: 'center', minHeight: '60vh', justifyContent: 'center' }}
          >
            <div>
              <IconBug
                size={64}
                color="var(--mantine-color-red-6)"
                style={{ margin: '0 auto 1rem' }}
              />
              <Title order={2} mb="md">
                Something went wrong
              </Title>
              <Text size="lg" c="dimmed" mb="xl">
                An unexpected error occurred while rendering this page.
              </Text>
            </div>

            <Button
              variant="filled"
              size="md"
              leftSection={<IconRefresh size={20} />}
              onClick={this.handleRetry}
            >
              Try Again
            </Button>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert color="red" title="Error Details" style={{ textAlign: 'left' }}>
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {this.state.error.message}
                  </Text>
                  {this.state.error.stack && (
                    <Code
                      block
                      style={{ fontSize: '0.75rem', maxHeight: '200px', overflow: 'auto' }}
                    >
                      {this.state.error.stack}
                    </Code>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        </Container>
      )
    }

    return this.props.children
  }
}

// Simple HOC for wrapping components
export function withErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode,
) {
  return (props: T) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
}
