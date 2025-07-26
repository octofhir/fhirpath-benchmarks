use anyhow::Result;
use async_trait::async_trait;
use std::path::PathBuf;

use crate::config::ImplementationConfig;
use crate::results::{TestResult, BenchmarkResult};
use crate::utils::find_virtual_env_python;
use super::{ImplementationRunner, BaseRunner};

pub struct PythonRunner {
    base: BaseRunner,
}

impl PythonRunner {
    pub fn new() -> Self {
        Self {
            base: BaseRunner::new("Python".to_string()),
        }
    }

    fn get_python_executable(&self, impl_dir: &PathBuf) -> Result<String> {
        // First, try to find virtual environment Python
        if let Some(venv_python) = find_virtual_env_python(impl_dir) {
            println!("Using virtual environment Python: {}", venv_python.display());
            return Ok(venv_python.to_string_lossy().to_string());
        }

        // Fallback to system Python
        println!("Using system Python");
        Ok("python".to_string())
    }

    async fn setup_virtual_env(&self, impl_dir: &PathBuf) -> Result<()> {
        let venv_path = impl_dir.join("venv");
        
        if !venv_path.exists() {
            println!("Creating virtual environment at {}", venv_path.display());
            
            let output = self.base.execute_command(
                &["python".to_string(), "-m".to_string(), "venv".to_string(), "venv".to_string()],
                impl_dir,
                300,
            ).await?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                anyhow::bail!("Failed to create virtual environment: {}", stderr);
            }
        }

        Ok(())
    }
}

#[async_trait]
impl ImplementationRunner for PythonRunner {
    fn name(&self) -> &str {
        &self.base.name
    }

    async fn setup(&self, config: &ImplementationConfig, impl_dir: &PathBuf) -> Result<()> {
        println!("🔧 Setting up {} implementation...", self.name());
        
        // Setup virtual environment if needed
        self.setup_virtual_env(impl_dir).await?;
        
        // Get the appropriate Python executable
        let python_exe = self.get_python_executable(impl_dir)?;
        
        // Create modified setup command with correct Python executable
        let mut setup_command = config.setup_command.clone();
        if !setup_command.is_empty() && setup_command[0] == "python" {
            setup_command[0] = python_exe;
        }

        let output = self.base.execute_command(
            &setup_command,
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
        crate::utils::cleanup_result_files(results_dir, "python", "test_results")?;

        // Get the appropriate Python executable
        let python_exe = self.get_python_executable(impl_dir)?;
        
        // Create modified test command with correct Python executable
        let mut test_command = config.test_command.clone();
        if !test_command.is_empty() && test_command[0] == "python" {
            test_command[0] = python_exe;
        }

        let output = self.base.execute_command(
            &test_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_test_result("python", &stderr));
        }

        // Try to load results from the generated file
        let pattern = "python_test_results*.json";
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
        crate::utils::cleanup_result_files(results_dir, "python", "benchmark_results")?;

        // Get the appropriate Python executable
        let python_exe = self.get_python_executable(impl_dir)?;
        
        // Create modified benchmark command with correct Python executable
        let mut benchmark_command = config.benchmark_command.clone();
        if !benchmark_command.is_empty() && benchmark_command[0] == "python" {
            benchmark_command[0] = python_exe;
        }

        let output = self.base.execute_command(
            &benchmark_command,
            impl_dir,
            config.timeout_seconds,
        ).await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(self.base.create_error_benchmark_result("python", &stderr));
        }

        // Try to load results from the generated file
        let pattern = "python_benchmark_results*.json";
        if let Some(result) = self.base.load_result_from_file::<BenchmarkResult>(results_dir, pattern).await? {
            return Ok(result);
        }

        // If no file found, return basic result
        Ok(self.base.create_error_benchmark_result("python", "No results file generated"))
    }
}

impl PythonRunner {
    fn parse_test_output(&self, output: &str) -> Result<TestResult> {
        let mut result = TestResult::new("python".to_string(), crate::utils::get_system_info());
        
        // Basic parsing - look for common test output patterns
        let lines: Vec<&str> = output.lines().collect();
        let mut passed_count = 0;
        let mut total_count = 0;

        for line in lines {
            if line.contains("✅") || line.to_lowercase().contains("passed") || line.contains("PASSED") {
                passed_count += 1;
                total_count += 1;
            } else if line.contains("❌") || line.to_lowercase().contains("failed") || line.contains("FAILED") || line.to_lowercase().contains("error") {
                total_count += 1;
            }
        }

        result.summary.total = total_count;
        result.summary.passed = passed_count;
        result.summary.failed = total_count - passed_count;

        Ok(result)
    }
}