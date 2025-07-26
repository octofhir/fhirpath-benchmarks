use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;

use crate::utils::{SystemInfo, ProcessStats};

// Serialization helper functions
fn serialize_uuid_as_string<S>(uuid: &Uuid, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&uuid.to_string())
}

fn serialize_datetime_as_string<S>(datetime: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&datetime.to_rfc3339())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionTiming {
    pub setup_time_ms: u128,
    pub execution_time_ms: u128,
    pub teardown_time_ms: u128,
    pub total_time_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatisticalSummary {
    pub mean: f64,
    pub median: f64,
    #[serde(rename = "stdDev")]
    pub std_dev: f64,
    #[serde(rename = "percentile95")]
    pub percentile_95: f64,
    #[serde(rename = "percentile99")]
    pub percentile_99: f64,
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    #[serde(serialize_with = "serialize_uuid_as_string")]
    pub id: Uuid,
    pub language: String,
    #[serde(serialize_with = "serialize_datetime_as_string")]
    pub timestamp: DateTime<Utc>,
    pub execution_time_ms: u128,
    pub timing: ExecutionTiming,
    pub system_info: SystemInfo,
    pub process_stats: Option<ProcessStats>,
    pub tests: Vec<TestCaseResult>,
    pub summary: TestSummary,
    pub metadata: ResultMetadata,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    #[serde(serialize_with = "serialize_uuid_as_string")]
    pub id: Uuid,
    pub language: String,
    #[serde(serialize_with = "serialize_datetime_as_string")]
    pub timestamp: DateTime<Utc>,
    pub timing: ExecutionTiming,
    pub system_info: SystemInfo,
    pub process_stats: Option<ProcessStats>,
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
    pub statistical_summary: StatisticalSummary,
    pub memory_stats: Option<ProcessStats>,
    pub warmup_iterations: usize,
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
    #[serde(serialize_with = "serialize_uuid_as_string")]
    pub id: Uuid,
    #[serde(serialize_with = "serialize_datetime_as_string")]
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
            timing: ExecutionTiming {
                setup_time_ms: 0,
                execution_time_ms: 0,
                teardown_time_ms: 0,
                total_time_ms: 0,
            },
            system_info,
            process_stats: None,
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
        let filename = format!("{}_test_results.json", self.language);
        let filepath = results_dir.join(filename);

        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&filepath, json)?;

        Ok(filepath)
    }

    pub fn export_to_csv(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("{}_test_results.csv", self.language);
        let filepath = results_dir.join(filename);

        let mut csv_content = String::new();
        csv_content.push_str("test_name,file,passed,execution_time_ms,error\n");

        for test in &self.tests {
            let passed = if test.passed { "true" } else { "false" };
            let error = test.error.as_deref().unwrap_or("");
            csv_content.push_str(&format!(
                "{},{},{},{},{}\n",
                test.name, test.file, passed, test.execution_time_ms, error
            ));
        }

        std::fs::write(&filepath, csv_content)?;
        Ok(filepath)
    }

    pub fn export_to_html(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("{}_test_results.html", self.language);
        let filepath = results_dir.join(filename);

        let pass_rate = if self.summary.total > 0 {
            (self.summary.passed as f64 / self.summary.total as f64) * 100.0
        } else {
            0.0
        };

        let html_content = format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <title>{} Test Results</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .summary {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .passed {{ color: green; }}
        .failed {{ color: red; }}
        .error {{ color: orange; }}
    </style>
</head>
<body>
    <h1>{} Test Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> {}</p>
        <p><strong>Passed:</strong> {} <span class="passed">({}%)</span></p>
        <p><strong>Failed:</strong> {} <span class="failed">({}%)</span></p>
        <p><strong>Errors:</strong> {} <span class="error">({}%)</span></p>
        <p><strong>Total Execution Time:</strong> {} ms</p>
        <p><strong>Generated:</strong> {}</p>
    </div>
    <h2>Detailed Results</h2>
    <table>
        <tr>
            <th>Test Name</th>
            <th>File</th>
            <th>Status</th>
            <th>Execution Time (ms)</th>
            <th>Error</th>
        </tr>
"#,
            self.language,
            self.language,
            self.summary.total,
            self.summary.passed, pass_rate,
            self.summary.failed, if self.summary.total > 0 { (self.summary.failed as f64 / self.summary.total as f64) * 100.0 } else { 0.0 },
            self.summary.errors, if self.summary.total > 0 { (self.summary.errors as f64 / self.summary.total as f64) * 100.0 } else { 0.0 },
            self.summary.execution_time_ms,
            self.timestamp.format("%Y-%m-%d %H:%M:%S UTC")
        );

        let mut html = html_content;
        for test in &self.tests {
            let status_class = if test.passed { "passed" } else if test.error.is_some() { "error" } else { "failed" };
            let status_text = if test.passed { "PASSED" } else if test.error.is_some() { "ERROR" } else { "FAILED" };
            let error_text = test.error.as_deref().unwrap_or("");

            html.push_str(&format!(
                r#"        <tr>
            <td>{}</td>
            <td>{}</td>
            <td class="{}">{}</td>
            <td>{}</td>
            <td>{}</td>
        </tr>
"#,
                test.name, test.file, status_class, status_text, test.execution_time_ms, error_text
            ));
        }

        html.push_str(r#"    </table>
</body>
</html>"#);

        std::fs::write(&filepath, html)?;
        Ok(filepath)
    }
}

impl BenchmarkResult {
    pub fn new(language: String, system_info: SystemInfo) -> Self {
        Self {
            id: Uuid::new_v4(),
            language,
            timestamp: Utc::now(),
            timing: ExecutionTiming {
                setup_time_ms: 0,
                execution_time_ms: 0,
                teardown_time_ms: 0,
                total_time_ms: 0,
            },
            system_info,
            process_stats: None,
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
        let filename = format!("{}_benchmark_results.json", self.language);
        let filepath = results_dir.join(filename);

        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&filepath, json)?;

        Ok(filepath)
    }

    pub fn export_to_csv(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("{}_benchmark_results.csv", self.language);
        let filepath = results_dir.join(filename);

        let mut csv_content = String::new();
        csv_content.push_str("benchmark_name,iterations,total_time_ms,avg_time_ms,median_time_ms,min_time_ms,max_time_ms,std_dev_ms\n");

        for benchmark in &self.benchmarks {
            csv_content.push_str(&format!(
                "{},{},{},{},{},{},{},{}\n",
                benchmark.name,
                benchmark.iterations,
                benchmark.total_time_ms,
                benchmark.avg_time_ms,
                benchmark.median_time_ms,
                benchmark.min_time_ms,
                benchmark.max_time_ms,
                benchmark.std_dev_ms
            ));
        }

        std::fs::write(&filepath, csv_content)?;
        Ok(filepath)
    }

    pub fn export_to_html(&self, results_dir: &PathBuf) -> Result<PathBuf> {
        let filename = format!("{}_benchmark_results.html", self.language);
        let filepath = results_dir.join(filename);

        let html_content = format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <title>{} Benchmark Results</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .summary {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
        .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }}
        .metric {{ background: white; padding: 10px; border-radius: 5px; border-left: 4px solid #007acc; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .fast {{ color: green; }}
        .slow {{ color: red; }}
        .chart {{ margin: 20px 0; height: 300px; background: #f9f9f9; border-radius: 5px; display: flex; align-items: center; justify-content: center; }}
    </style>
</head>
<body>
    <h1>{} Benchmark Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="metrics">
            <div class="metric">
                <h3>Total Cases</h3>
                <p style="font-size: 2em; margin: 0;">{}</p>
            </div>
            <div class="metric">
                <h3>Total Iterations</h3>
                <p style="font-size: 2em; margin: 0;">{}</p>
            </div>
            <div class="metric">
                <h3>Average Time</h3>
                <p style="font-size: 2em; margin: 0;">{:.2} ms</p>
            </div>
            <div class="metric">
                <h3>Total Time</h3>
                <p style="font-size: 2em; margin: 0;">{} ms</p>
            </div>
        </div>
        <p><strong>Generated:</strong> {}</p>
    </div>
    <h2>Detailed Results</h2>
    <table>
        <tr>
            <th>Benchmark Name</th>
            <th>Iterations</th>
            <th>Avg Time (ms)</th>
            <th>Median (ms)</th>
            <th>Min (ms)</th>
            <th>Max (ms)</th>
            <th>Std Dev (ms)</th>
            <th>Total Time (ms)</th>
        </tr>
"#,
            self.language,
            self.language,
            self.summary.total_cases,
            self.summary.total_iterations,
            self.summary.avg_time_per_case_ms,
            self.summary.total_time_ms,
            self.timestamp.format("%Y-%m-%d %H:%M:%S UTC")
        );

        let mut html = html_content;
        for benchmark in &self.benchmarks {
            let avg_class = if benchmark.avg_time_ms < 10.0 { "fast" } else if benchmark.avg_time_ms > 100.0 { "slow" } else { "" };

            html.push_str(&format!(
                r#"        <tr>
            <td>{}</td>
            <td>{}</td>
            <td class="{}">{:.2}</td>
            <td>{:.2}</td>
            <td>{}</td>
            <td>{}</td>
            <td>{:.2}</td>
            <td>{}</td>
        </tr>
"#,
                benchmark.name,
                benchmark.iterations,
                avg_class,
                benchmark.avg_time_ms,
                benchmark.median_time_ms,
                benchmark.min_time_ms,
                benchmark.max_time_ms,
                benchmark.std_dev_ms,
                benchmark.total_time_ms
            ));
        }

        html.push_str(r#"    </table>
    <div class="chart">
        <p>Performance Chart Placeholder (can be enhanced with JavaScript charting library)</p>
    </div>
</body>
</html>"#);

        std::fs::write(&filepath, html)?;
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
        let filename = "comparison_report.json".to_string();
        let filepath = results_dir.join(filename);

        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&filepath, json)?;

        Ok(filepath)
    }
}

impl ExecutionTiming {
    pub fn new() -> Self {
        Self {
            setup_time_ms: 0,
            execution_time_ms: 0,
            teardown_time_ms: 0,
            total_time_ms: 0,
        }
    }

    pub fn calculate_total(&mut self) {
        self.total_time_ms = self.setup_time_ms + self.execution_time_ms + self.teardown_time_ms;
    }
}

impl StatisticalSummary {
    pub fn calculate(values: &[f64]) -> Self {
        if values.is_empty() {
            return Self {
                mean: 0.0,
                median: 0.0,
                std_dev: 0.0,
                percentile_95: 0.0,
                percentile_99: 0.0,
                min: 0.0,
                max: 0.0,
            };
        }

        let mut sorted_values = values.to_vec();
        sorted_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let mean = values.iter().sum::<f64>() / values.len() as f64;
        let median = if sorted_values.len() % 2 == 0 {
            (sorted_values[sorted_values.len() / 2 - 1] + sorted_values[sorted_values.len() / 2]) / 2.0
        } else {
            sorted_values[sorted_values.len() / 2]
        };

        let variance = values
            .iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>() / values.len() as f64;
        let std_dev = variance.sqrt();

        let percentile_95 = Self::percentile(&sorted_values, 95.0);
        let percentile_99 = Self::percentile(&sorted_values, 99.0);
        let min = sorted_values[0];
        let max = sorted_values[sorted_values.len() - 1];

        Self {
            mean,
            median,
            std_dev,
            percentile_95,
            percentile_99,
            min,
            max,
        }
    }

    fn percentile(sorted_values: &[f64], percentile: f64) -> f64 {
        if sorted_values.is_empty() {
            return 0.0;
        }

        let index = (percentile / 100.0) * (sorted_values.len() - 1) as f64;
        let lower_index = index.floor() as usize;
        let upper_index = index.ceil() as usize;

        if lower_index == upper_index {
            sorted_values[lower_index]
        } else {
            let weight = index - lower_index as f64;
            sorted_values[lower_index] * (1.0 - weight) + sorted_values[upper_index] * weight
        }
    }
}
