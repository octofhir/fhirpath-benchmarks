use anyhow::Result;
use async_trait::async_trait;
use std::path::PathBuf;

use crate::config::ImplementationConfig;
use crate::results::{TestResult, BenchmarkResult};
use super::{ImplementationRunner, BaseRunner};

pub struct JavaScriptRunner {
    base: BaseRunner,
}

impl JavaScriptRunner {
    pub fn new() -> Self {
        Self {
            base: BaseRunner::new("JavaScript".to_string()),
        }
    }
}

#[async_trait]
impl ImplementationRunner for JavaScriptRunner {
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

        // Clean up old result files
        crate::utils::cleanup_result_files(results_dir, "javascript", "test_results")?;

        let output = self.base.execute_command(
            &config.test_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_test_result("javascript", &stderr));
        }

        // Try to load results from the generated file
        let pattern = "javascript_test_results*.json";
        if let Some(result) = self.base.load_result_from_file::<TestResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        // Fallback: parse output for basic results
        let stdout = String::from_utf8_lossy(&output.stdout);
        self.parse_test_output(&stdout)
    }

    async fn run_benchmarks(&self, config: &ImplementationConfig, impl_dir: &PathBuf, results_dir: &PathBuf) -> Result<BenchmarkResult> {
        println!("⚡ Running benchmarks for {}...", self.name());

        // Clean up old result files
        crate::utils::cleanup_result_files(results_dir, "javascript", "benchmark_results")?;

        let output = self.base.execute_command(
            &config.benchmark_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_benchmark_result("javascript", &stderr));
        }

        // Try to load results from the generated file
        let pattern = "javascript_benchmark_results*.json";
        if let Some(result) = self.base.load_result_from_file::<BenchmarkResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        // If no file found, return basic result
        Ok(self.base.create_error_benchmark_result("javascript", "No results file generated"))
    }
}

impl JavaScriptRunner {
    fn parse_test_output(&self, output: &str) -> Result<TestResult> {
        let mut result = TestResult::new("javascript".to_string(), crate::utils::get_system_info());
        
        // Basic parsing - look for common test output patterns
        let lines: Vec<&str> = output.lines().collect();
        let mut passed_count = 0;
        let mut total_count = 0;

        for line in lines {
            if line.contains("✅") || line.to_lowercase().contains("passed") {
                passed_count += 1;
                total_count += 1;
            } else if line.contains("❌") || line.to_lowercase().contains("failed") || line.to_lowercase().contains("error") {
                total_count += 1;
            }
        }

        result.summary.total = total_count;
        result.summary.passed = passed_count;
        result.summary.failed = total_count - passed_count;

        Ok(result)
    }
}