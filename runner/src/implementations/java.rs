use anyhow::Result;
use async_trait::async_trait;
use std::path::PathBuf;

use crate::config::ImplementationConfig;
use crate::results::{TestResult, BenchmarkResult};
use super::{ImplementationRunner, BaseRunner};

pub struct JavaRunner {
    base: BaseRunner,
}

impl JavaRunner {
    pub fn new() -> Self {
        Self {
            base: BaseRunner::new("Java".to_string()),
        }
    }
}

#[async_trait]
impl ImplementationRunner for JavaRunner {
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

        crate::utils::cleanup_result_files(results_dir, "java", "test_results")?;

        let output = self.base.execute_command(
            &config.test_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_test_result("java", &stderr));
        }

        let pattern = "java_test_results*.json";
        if let Some(result) = self.base.load_result_from_file::<TestResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        self.parse_test_output(&stdout)
    }

    async fn run_benchmarks(&self, config: &ImplementationConfig, impl_dir: &PathBuf, results_dir: &PathBuf) -> Result<BenchmarkResult> {
        println!("⚡ Running benchmarks for {}...", self.name());

        crate::utils::cleanup_result_files(results_dir, "java", "benchmark_results")?;

        let output = self.base.execute_command(
            &config.benchmark_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_benchmark_result("java", &stderr));
        }

        let pattern = "java_benchmark_results*.json";
        if let Some(result) = self.base.load_result_from_file::<BenchmarkResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        Ok(self.base.create_error_benchmark_result("java", "No results file generated"))
    }
}

impl JavaRunner {
    fn parse_test_output(&self, output: &str) -> Result<TestResult> {
        let mut result = TestResult::new("java".to_string(), crate::utils::get_system_info());
        
        let lines: Vec<&str> = output.lines().collect();
        let mut passed_count = 0;
        let mut total_count = 0;

        for line in lines {
            if line.contains("✅") || line.to_lowercase().contains("passed") || line.contains("SUCCESS") {
                passed_count += 1;
                total_count += 1;
            } else if line.contains("❌") || line.to_lowercase().contains("failed") || line.contains("FAILURE") || line.to_lowercase().contains("error") {
                total_count += 1;
            }
        }

        result.summary.total = total_count;
        result.summary.passed = passed_count;
        result.summary.failed = total_count - passed_count;

        Ok(result)
    }
}