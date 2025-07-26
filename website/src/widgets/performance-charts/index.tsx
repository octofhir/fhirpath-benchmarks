import { BarChart, PieChart } from '@mantine/charts'
import { Grid } from '@mantine/core'
import type { ImplementationMetadata } from '@shared/lib'
import { ChartContainer, ResponsiveChart } from '@shared/ui'

interface PerformanceChartsProps {
  implementations: ImplementationMetadata[]
  benchmarkResults?: any[] // Will be properly typed when benchmark data is available
}

export function PerformanceCharts({ implementations }: PerformanceChartsProps) {
  // Transform data for charts
  const passRateData = implementations.map((impl) => ({
    implementation: impl.name,
    passRate: impl.pass_rate,
    passed: impl.passed_tests,
    failed: impl.failed_tests,
    errors: impl.error_count,
  }))

  const performanceData = implementations.map((impl) => ({
    implementation: impl.name,
    avgTime: impl.avg_execution_time,
  }))

  const categoryData = [
    { name: 'Arithmetic', tests: 45, passed: 42, passRate: 93.3 },
    { name: 'Logic', tests: 38, passed: 35, passRate: 92.1 },
    { name: 'String', tests: 52, passed: 48, passRate: 92.3 },
    { name: 'Navigation', tests: 34, passed: 31, passRate: 91.2 },
    { name: 'Functions', tests: 28, passed: 25, passRate: 89.3 },
    { name: 'Collections', tests: 41, passed: 37, passRate: 90.2 },
  ]

  return (
    <Grid>
      {/* Pass Rate Comparison */}
      <Grid.Col span={{ base: 12, lg: 6 }}>
        <ChartContainer
          title="Pass Rate Comparison"
          badge={{ label: 'Success Rates', color: 'green' }}
        >
          <ResponsiveChart>
            <BarChart
              h={300}
              data={passRateData}
              dataKey="implementation"
              series={[{ name: 'passRate', color: 'blue.6', label: 'Pass Rate (%)' }]}
              tickLine="xy"
              gridAxis="xy"
              withTooltip
              tooltipAnimationDuration={200}
            />
          </ResponsiveChart>
        </ChartContainer>
      </Grid.Col>

      {/* Performance Comparison */}
      <Grid.Col span={{ base: 12, lg: 6 }}>
        <ChartContainer
          title="Performance Comparison"
          badge={{ label: 'Execution Time', color: 'orange' }}
        >
          <ResponsiveChart>
            <BarChart
              h={300}
              data={performanceData}
              dataKey="implementation"
              series={[{ name: 'avgTime', color: 'orange.6', label: 'Avg Time (ms)' }]}
              tickLine="xy"
              gridAxis="xy"
              withTooltip
              tooltipAnimationDuration={200}
            />
          </ResponsiveChart>
        </ChartContainer>
      </Grid.Col>

      {/* Test Category Breakdown */}
      <Grid.Col span={{ base: 12, lg: 6 }}>
        <ChartContainer
          title="Test Category Breakdown"
          badge={{ label: 'Categories', color: 'purple' }}
        >
          <ResponsiveChart>
            <PieChart
              h={300}
              data={categoryData.map((cat) => ({
                name: cat.name,
                value: cat.tests,
                color: `var(--mantine-color-${['blue', 'green', 'orange', 'purple', 'red', 'yellow'][categoryData.indexOf(cat)]}-6)`,
              }))}
              withTooltip
              tooltipDataSource="segment"
              mx="auto"
            />
          </ResponsiveChart>
        </ChartContainer>
      </Grid.Col>

      {/* Pass Rate by Category */}
      <Grid.Col span={{ base: 12, lg: 6 }}>
        <ChartContainer
          title="Pass Rate by Category"
          badge={{ label: 'Category Success', color: 'teal' }}
        >
          <ResponsiveChart>
            <BarChart
              h={300}
              data={categoryData}
              dataKey="name"
              series={[{ name: 'passRate', color: 'teal.6', label: 'Pass Rate (%)' }]}
              tickLine="xy"
              gridAxis="xy"
              withTooltip
              tooltipAnimationDuration={200}
            />
          </ResponsiveChart>
        </ChartContainer>
      </Grid.Col>
    </Grid>
  )
}
