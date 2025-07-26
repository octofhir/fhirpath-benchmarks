use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;

use crate::utils::{SystemInfo, ProcessStats, get_timestamp};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub id: Uuid,
    pub language: String,
    pub timestamp: DateTime<Utc>,
    pub execution_time_ms: u128,
    pub system_info: SystemInfo,
    pub tests: Vec<TestCaseResult>,
    pub summary: TestSummary,
    pub metadata: ResultMetadata,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub id: Uuid,
    pub language: String,
    pub timestamp: DateTime<Utc>,
    pub system_info: SystemInfo,
    pub benchmarks: Vec<BenchmarkCaseResult>,
    pub summary: BenchmarkSummary,
    pub metadata: ResultMetadata,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseResult {
    pub name: String,
    pub file: String,
    pub passed: bool,
    pub execution_time_ms: u128,
    pub expected: serde_json::Value,
    pub actual: Option<serde_json::Value>,
    pub error: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkCaseResult {
    pub name: String,
    pub file: String,
    pub iterations: usize,
    pub total_time_ms: u128,
    pub avg_time_ms: f64,
    pub median_time_ms: f64,
    pub min_time_ms: u128,
    pub max_time_ms: u128,
    pub std_dev_ms: f64,
    pub times: Vec<u128>,
    pub memory_stats: Option<ProcessStats>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSummary {
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
    pub errors: usize,
    pub execution_time_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkSummary {
    pub total_cases: usize,
    pub total_iterations: usize,
    pub total_time_ms: u128,
    pub avg_time_per_case_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultMetadata {
    pub runner_version: String,
    pub format_version: String,
    pub environment: HashMap<String, String>,
    pub command_line: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonReport {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub test_results: Vec<TestResult>,
    pub benchmark_results: Vec<BenchmarkResult>,
    pub summary: ComparisonSummary,
    pub metadata: ResultMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonSummary {
    pub languages_tested: usize,
    pub total_tests: usize,
    pub total_benchmarks: usize,
    pub fastest_implementation: Option<String>,
    pub most_compliant_implementation: Option<String>,
}

impl TestResult {
    pub fn new(language: String, system_info: SystemInfo) -> Self {
        Self {
            id: Uuid::new_v4(),
            language,
            timestamp: Utc::now(),
            execution_time_ms: 0,
            system_info,
            tests: Vec::new(),
            summary: TestSummary {
                total: 0,
                passed: 0,
                failed: 0,
                errors: 0,
                execution_time_ms: 0,
            },
            metadata: ResultMetadata::new(),
            error: None,
        }
    }

    pub fn add_test_case(&mut self, test_case: TestCaseResult) {
        self.summary.total += 1;
        if test_case.passed {
            self.summary.passed += 1;
        } else if test_case.error.is_some() {
            self.summary.errors += 1;
        } else {
            self.summary.failed += 1;
        }
        self.summary.execution_time_ms += test_case.execution_time_ms;
        self.tests.push(test_case);
    }

    pub fn save_to_file(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("{}_test_results_{}.json", self.language, get_timestamp());
        let filepath = results_dir.join(filename);
        
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&filepath, json)?;
        
        Ok(filepath)
    }
}

impl BenchmarkResult {
    pub fn new(language: String, system_info: SystemInfo) -> Self {
        Self {
            id: Uuid::new_v4(),
            language,
            timestamp: Utc::now(),
            system_info,
            benchmarks: Vec::new(),
            summary: BenchmarkSummary {
                total_cases: 0,
                total_iterations: 0,
                total_time_ms: 0,
                avg_time_per_case_ms: 0.0,
            },
            metadata: ResultMetadata::new(),
            error: None,
        }
    }

    pub fn add_benchmark_case(&mut self, benchmark_case: BenchmarkCaseResult) {
        self.summary.total_cases += 1;
        self.summary.total_iterations += benchmark_case.iterations;
        self.summary.total_time_ms += benchmark_case.total_time_ms;
        
        if self.summary.total_cases > 0 {
            self.summary.avg_time_per_case_ms = 
                self.summary.total_time_ms as f64 / self.summary.total_cases as f64;
        }
        
        self.benchmarks.push(benchmark_case);
    }

    pub fn save_to_file(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("{}_benchmark_results_{}.json", self.language, get_timestamp());
        let filepath = results_dir.join(filename);
        
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&filepath, json)?;
        
        Ok(filepath)
    }
}

impl ResultMetadata {
    pub fn new() -> Self {
        let mut environment = HashMap::new();
        
        // Collect relevant environment variables
        if let Ok(path) = std::env::var("PATH") {
            environment.insert("PATH".to_string(), path);
        }
        if let Ok(home) = std::env::var("HOME") {
            environment.insert("HOME".to_string(), home);
        }
        
        Self {
            runner_version: env!("CARGO_PKG_VERSION").to_string(),
            format_version: "2.0".to_string(),
            environment,
            command_line: std::env::args().collect(),
        }
    }
}

impl ComparisonReport {
    pub fn new(test_results: Vec<TestResult>, benchmark_results: Vec<BenchmarkResult>) -> Self {
        let summary = Self::calculate_summary(&test_results, &benchmark_results);
        
        Self {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            test_results,
            benchmark_results,
            summary,
            metadata: ResultMetadata::new(),
        }
    }

    fn calculate_summary(test_results: &[TestResult], benchmark_results: &[BenchmarkResult]) -> ComparisonSummary {
        let languages_tested = test_results.len().max(benchmark_results.len());
        let total_tests = test_results.iter().map(|r| r.summary.total).sum();
        let total_benchmarks = benchmark_results.iter().map(|r| r.summary.total_cases).sum();
        
        // Find fastest implementation (lowest avg benchmark time)
        let fastest_implementation = benchmark_results
            .iter()
            .min_by(|a, b| {
                a.summary.avg_time_per_case_ms
                    .partial_cmp(&b.summary.avg_time_per_case_ms)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|r| r.language.clone());
        
        // Find most compliant implementation (highest pass rate)
        let most_compliant_implementation = test_results
            .iter()
            .max_by(|a, b| {
                let a_rate = if a.summary.total > 0 {
                    a.summary.passed as f64 / a.summary.total as f64
                } else {
                    0.0
                };
                let b_rate = if b.summary.total > 0 {
                    b.summary.passed as f64 / b.summary.total as f64
                } else {
                    0.0
                };
                a_rate.partial_cmp(&b_rate).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|r| r.language.clone());
        
        ComparisonSummary {
            languages_tested,
            total_tests,
            total_benchmarks,
            fastest_implementation,
            most_compliant_implementation,
        }
    }

    pub fn save_to_file(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("comparison_report_{}.json", get_timestamp());
        let filepath = results_dir.join(filename);
        
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&filepath, json)?;
        
        Ok(filepath)
    }
}