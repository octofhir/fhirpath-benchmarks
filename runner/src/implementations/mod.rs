use anyhow::Result;
use async_trait::async_trait;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

use crate::config::ImplementationConfig;
use crate::results::{TestResult, BenchmarkResult};
use crate::utils::get_system_info;

pub mod javascript;
pub mod python;
pub mod java;
pub mod csharp;
pub mod rust;
pub mod go;
pub mod clojure;

#[async_trait]
pub trait ImplementationRunner: Send + Sync {
    fn name(&self) -> &str;
    
    async fn setup(&self, config: &ImplementationConfig, impl_dir: &PathBuf) -> Result<()>;
    
    async fn run_tests(&self, config: &ImplementationConfig, impl_dir: &PathBuf, results_dir: &PathBuf) -> Result<TestResult>;
    
    async fn run_benchmarks(&self, config: &ImplementationConfig, impl_dir: &PathBuf, results_dir: &PathBuf) -> Result<BenchmarkResult>;
}

pub struct BaseRunner {
    pub name: String,
}

impl BaseRunner {
    pub fn new(name: String) -> Self {
        Self { name }
    }

    pub async fn execute_command(&self, 
                                command: &[String], 
                                working_dir: &PathBuf, 
                                timeout_secs: u64) -> Result<std::process::Output> {
        if command.is_empty() {
            anyhow::bail!("Empty command provided");
        }

        let mut cmd = Command::new(&command[0]);
        if command.len() > 1 {
            cmd.args(&command[1..]);
        }
        
        cmd.current_dir(working_dir)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let timeout_duration = Duration::from_secs(timeout_secs);
        
        match timeout(timeout_duration, cmd.output()).await {
            Ok(Ok(output)) => Ok(output),
            Ok(Err(e)) => anyhow::bail!("Command execution failed: {}", e),
            Err(_) => anyhow::bail!("Command timed out after {} seconds", timeout_secs),
        }
    }

    pub fn create_error_test_result(&self, language: &str, error: &str) -> TestResult {
        let mut result = TestResult::new(language.to_string(), get_system_info());
        result.error = Some(error.to_string());
        result.summary.errors = 1;
        result
    }

    pub fn create_error_benchmark_result(&self, language: &str, error: &str) -> BenchmarkResult {
        let mut result = BenchmarkResult::new(language.to_string(), get_system_info());
        result.error = Some(error.to_string());
        result
    }

    pub async fn load_result_from_file<T>(&self, results_dir: &PathBuf, pattern: &str) -> Result<Option<T>>
    where
        T: serde::de::DeserializeOwned,
    {
        let pattern_path = results_dir.join(pattern);
        
        if let Ok(entries) = glob::glob(&pattern_path.to_string_lossy()) {
            for entry in entries {
                if let Ok(path) = entry {
                    if let Ok(content) = tokio::fs::read_to_string(&path).await {
                        if let Ok(result) = serde_json::from_str::<T>(&content) {
                            return Ok(Some(result));
                        }
                    }
                }
            }
        }
        
        Ok(None)
    }
}

pub fn create_runner(language: &str) -> Box<dyn ImplementationRunner> {
    match language {
        "javascript" => Box::new(javascript::JavaScriptRunner::new()),
        "python" => Box::new(python::PythonRunner::new()),
        "java" => Box::new(java::JavaRunner::new()),
        "csharp" => Box::new(csharp::CSharpRunner::new()),
        "rust" => Box::new(rust::RustRunner::new()),
        "go" => Box::new(go::GoRunner::new()),
        "clojure" => Box::new(clojure::ClojureRunner::new()),
        _ => panic!("Unsupported language: {}", language),
    }
}