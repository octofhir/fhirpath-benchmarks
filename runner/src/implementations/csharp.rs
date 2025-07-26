use anyhow::Result;
use async_trait::async_trait;
use std::path::PathBuf;

use crate::config::ImplementationConfig;
use crate::results::{TestResult, BenchmarkResult};
use super::{ImplementationRunner, BaseRunner};

pub struct CSharpRunner {
    base: BaseRunner,
}

impl CSharpRunner {
    pub fn new() -> Self {
        Self {
            base: BaseRunner::new("C#".to_string()),
        }
    }
}

#[async_trait]
impl ImplementationRunner for CSharpRunner {
    fn name(&self) -> &str {
        &self.base.name
    }

    async fn setup(&self, config: &ImplementationConfig, impl_dir: &PathBuf) -> Result<()> {
        println!("🔧 Setting up {} implementation...", self.name());

        let output = self.base.execute_command(
            &config.setup_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Setup failed: {}", stderr);
        }

        println!("✅ {} setup completed", self.name());
        Ok(())
    }

    async fn run_tests(&self, config: &ImplementationConfig, impl_dir: &PathBuf, results_dir: &PathBuf) -> Result<TestResult> {
        println!("🧪 Running tests for {}...", self.name());

        crate::utils::cleanup_result_files(results_dir, "csharp", "test_results")?;

        let output = self.base.execute_command(
            &config.test_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_test_result("csharp", &stderr));
        }

        let pattern = "csharp_test_results.json";
        if let Some(result) = self.base.load_result_from_file::<TestResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        self.parse_test_output(&stdout)
    }

    async fn run_benchmarks(&self, config: &ImplementationConfig, impl_dir: &PathBuf, results_dir: &PathBuf) -> Result<BenchmarkResult> {
        println!("⚡ Running benchmarks for {}...", self.name());

        crate::utils::cleanup_result_files(results_dir, "csharp", "benchmark_results")?;

        let output = self.base.execute_command(
            &config.benchmark_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_benchmark_result("csharp", &stderr));
        }

        let pattern = "csharp_benchmark_results.json";
        if let Some(result) = self.base.load_result_from_file::<BenchmarkResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        Ok(self.base.create_error_benchmark_result("csharp", "No results file generated"))
    }
}

impl CSharpRunner {
    fn parse_test_output(&self, output: &str) -> Result<TestResult> {
        let mut result = TestResult::new("csharp".to_string(), crate::utils::get_system_info());

        let lines: Vec<&str> = output.lines().collect();
        let mut passed_count = 0;
        let mut total_count = 0;

        for line in lines {
            if line.contains("✅") || line.to_lowercase().contains("passed") || line.contains("Passed!") {
                passed_count += 1;
                total_count += 1;
            } else if line.contains("❌") || line.to_lowercase().contains("failed") || line.contains("Failed!") || line.to_lowercase().contains("error") {
                total_count += 1;
            }
        }

        result.summary.total = total_count;
        result.summary.passed = passed_count;
        result.summary.failed = total_count - passed_count;

        Ok(result)
    }
}
