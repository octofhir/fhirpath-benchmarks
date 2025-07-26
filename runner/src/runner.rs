use anyhow::Result;
use std::collections::HashMap;
use std::path::PathBuf;
use futures::future::join_all;

use crate::config::Config;
use crate::results::{TestResult, BenchmarkResult, ComparisonReport};
use crate::implementations::create_runner;
use crate::utils::cleanup_result_files;
use crate::test_cases::{TestCaseLoader, TestCaseFilter};

pub struct Runner {
    config: Config,
}

impl Runner {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    pub fn get_config(&self) -> &Config {
        &self.config
    }

    pub fn get_available_implementations(&self) -> Result<Vec<String>> {
        let mut implementations = Vec::new();
        
        if self.config.implementations_dir.exists() {
            for entry in std::fs::read_dir(&self.config.implementations_dir)? {
                let entry = entry?;
                if entry.file_type()?.is_dir() {
                    if let Some(name) = entry.file_name().to_str() {
                        if !name.starts_with('.') && self.config.implementations.contains_key(name) {
                            implementations.push(name.to_string());
                        }
                    }
                }
            }
        }
        
        implementations.sort();
        Ok(implementations)
    }

    pub async fn setup_implementation(&self, language: &str) -> Result<bool> {
        let impl_config = self.config.implementations.get(language)
            .ok_or_else(|| anyhow::anyhow!("Unknown implementation: {}", language))?;
        
        let impl_dir = self.config.implementations_dir.join(language);
        if !impl_dir.exists() {
            anyhow::bail!("Implementation directory not found: {}", language);
        }

        let runner = create_runner(language);
        
        match runner.setup(impl_config, &impl_dir).await {
            Ok(_) => {
                println!("✅ {} setup completed successfully", runner.name());
                Ok(true)
            }
            Err(e) => {
                println!("❌ Failed to setup {}: {}", runner.name(), e);
                Ok(false)
            }
        }
    }

    pub async fn setup_implementations(&self, languages: &[String]) -> Result<HashMap<String, bool>> {
        let mut results = HashMap::new();
        
        println!("🔧 Setting up {} implementations...", languages.len());
        
        for language in languages {
            let success = self.setup_implementation(language).await?;
            results.insert(language.clone(), success);
        }
        
        Ok(results)
    }

    pub async fn run_tests(&self, languages: &[String]) -> Result<Vec<TestResult>> {
        let mut test_results = Vec::new();
        
        println!("🧪 Running tests for {} implementations...", languages.len());
        
        for language in languages {
            let result = self.run_tests_for_language(language).await?;
            test_results.push(result);
        }
        
        Ok(test_results)
    }

    pub async fn run_tests_for_language(&self, language: &str) -> Result<TestResult> {
        let impl_config = self.config.implementations.get(language)
            .ok_or_else(|| anyhow::anyhow!("Unknown implementation: {}", language))?;
        
        let impl_dir = self.config.implementations_dir.join(language);
        let runner = create_runner(language);
        
        // Load and prepare test cases
        let mut test_loader = TestCaseLoader::new(self.config.specs_dir.clone());
        test_loader.load_all_test_suites()?;
        
        let filter = TestCaseFilter::default();
        let test_cases = test_loader.filter_test_cases(&filter);
        
        println!("📋 Loaded {} test cases for {}", test_cases.len(), language);
        
        runner.run_tests(impl_config, &impl_dir, &self.config.results_dir).await
    }

    pub async fn run_benchmarks(&self, languages: &[String]) -> Result<Vec<BenchmarkResult>> {
        let mut benchmark_results = Vec::new();
        
        println!("⚡ Running benchmarks for {} implementations...", languages.len());
        
        for language in languages {
            let result = self.run_benchmarks_for_language(language).await?;
            benchmark_results.push(result);
        }
        
        Ok(benchmark_results)
    }

    pub async fn run_benchmarks_for_language(&self, language: &str) -> Result<BenchmarkResult> {
        let impl_config = self.config.implementations.get(language)
            .ok_or_else(|| anyhow::anyhow!("Unknown implementation: {}", language))?;
        
        let impl_dir = self.config.implementations_dir.join(language);
        let runner = create_runner(language);
        
        // Load and prepare test cases
        let mut test_loader = TestCaseLoader::new(self.config.specs_dir.clone());
        test_loader.load_all_test_suites()?;
        
        let filter = TestCaseFilter::default();
        let test_cases = test_loader.filter_test_cases(&filter);
        
        println!("📋 Loaded {} test cases for {} benchmarking", test_cases.len(), language);
        
        runner.run_benchmarks(impl_config, &impl_dir, &self.config.results_dir).await
    }

    pub async fn run_parallel_tests(&self, languages: &[String]) -> Result<Vec<TestResult>> {
        println!("🧪 Running tests in parallel for {} implementations...", languages.len());
        
        let test_futures: Vec<_> = languages.iter().map(|lang| {
            async move {
                self.run_tests_for_language(lang).await
            }
        }).collect();
        
        let results = join_all(test_futures).await;
        
        let mut test_results = Vec::new();
        for result in results {
            match result {
                Ok(test_result) => test_results.push(test_result),
                Err(e) => println!("❌ Test execution error: {}", e),
            }
        }
        
        Ok(test_results)
    }

    pub async fn run_parallel_benchmarks(&self, languages: &[String]) -> Result<Vec<BenchmarkResult>> {
        println!("⚡ Running benchmarks in parallel for {} implementations...", languages.len());
        
        let benchmark_futures: Vec<_> = languages.iter().map(|lang| {
            async move {
                self.run_benchmarks_for_language(lang).await
            }
        }).collect();
        
        let results = join_all(benchmark_futures).await;
        
        let mut benchmark_results = Vec::new();
        for result in results {
            match result {
                Ok(benchmark_result) => benchmark_results.push(benchmark_result),
                Err(e) => println!("❌ Benchmark execution error: {}", e),
            }
        }
        
        Ok(benchmark_results)
    }

    pub fn generate_report(&self, test_results: Vec<TestResult>, benchmark_results: Vec<BenchmarkResult>) -> Result<PathBuf> {
        let report = ComparisonReport::new(test_results, benchmark_results);
        
        // Save detailed report
        let report_path = report.save_to_file(&self.config.results_dir)?;
        
        // Print summary
        self.print_summary(&report);
        
        println!("📊 Report saved to: {}", report_path.display());
        
        Ok(report_path)
    }

    fn print_summary(&self, report: &ComparisonReport) {
        println!("\n{}", "=".repeat(60));
        println!("FHIRPATH LIBRARY COMPARISON SUMMARY");
        println!("{}", "=".repeat(60));
        
        // Test results summary
        if !report.test_results.is_empty() {
            println!("\nTest Results:");
            for result in &report.test_results {
                let summary = &result.summary;
                println!("{:12} | Tests: {:3}/{:3} passed", 
                         result.language, 
                         summary.passed, 
                         summary.total);
            }
        }
        
        // Benchmark results summary
        if !report.benchmark_results.is_empty() {
            println!("\nBenchmark Results (avg time per case in ms):");
            for result in &report.benchmark_results {
                println!("\n{}:", result.language);
                for bench in &result.benchmarks {
                    println!("  {:25} | {:6.2} ms", bench.name, bench.avg_time_ms);
                }
            }
        }
        
        // Overall summary
        if let Some(ref fastest) = report.summary.fastest_implementation {
            println!("\n🏆 Fastest implementation: {}", fastest);
        }
        
        if let Some(ref most_compliant) = report.summary.most_compliant_implementation {
            println!("🎯 Most compliant implementation: {}", most_compliant);
        }
        
        println!("\n📊 Total languages tested: {}", report.summary.languages_tested);
        println!("📊 Total tests executed: {}", report.summary.total_tests);
        println!("📊 Total benchmarks executed: {}", report.summary.total_benchmarks);
    }

    pub fn cleanup_old_results(&self, language: &str) -> Result<()> {
        cleanup_result_files(&self.config.results_dir, language, "test_results")?;
        cleanup_result_files(&self.config.results_dir, language, "benchmark_results")?;
        Ok(())
    }

    pub fn validate_setup(&self) -> Result<()> {
        self.config.validate()?;
        
        // Check if required tools are available
        let available_impls = self.get_available_implementations()?;
        if available_impls.is_empty() {
            anyhow::bail!("No implementation directories found");
        }
        
        println!("✅ Configuration validated successfully");
        println!("🔍 Available implementations: {}", available_impls.join(", "));
        
        Ok(())
    }
}