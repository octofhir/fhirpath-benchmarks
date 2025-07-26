use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub project_root: PathBuf,
    pub implementations_dir: PathBuf,
    pub specs_dir: PathBuf,
    pub results_dir: PathBuf,
    pub implementations: HashMap<String, ImplementationConfig>,
    pub runner: RunnerConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationConfig {
    pub name: String,
    pub setup_command: Vec<String>,
    pub test_command: Vec<String>,
    pub benchmark_command: Vec<String>,
    pub timeout_seconds: u64,
    pub env_vars: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerConfig {
    pub parallel_workers: usize,
    pub benchmark_iterations: usize,
    pub warmup_iterations: usize,
    pub result_format_version: String,
}

impl Default for Config {
    fn default() -> Self {
        let project_root = PathBuf::from("../");

        Self {
            implementations_dir: project_root.join("implementations"),
            specs_dir: project_root.join("specs"),
            results_dir: project_root.join("results"),
            project_root,
            implementations: create_default_implementations(),
            runner: RunnerConfig {
                parallel_workers: 4,
                benchmark_iterations: 10,
                warmup_iterations: 3,
                result_format_version: "2.0".to_string(),
            },
        }
    }
}

impl Config {
    pub fn load_from_file(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }

    pub fn load_with_env_overrides() -> Result<Self> {
        let mut config = Self::default();

        // Override with environment variables
        if let Ok(workers) = std::env::var("FHIRPATH_PARALLEL_WORKERS") {
            if let Ok(workers) = workers.parse::<usize>() {
                config.runner.parallel_workers = workers;
            }
        }

        if let Ok(iterations) = std::env::var("FHIRPATH_BENCHMARK_ITERATIONS") {
            if let Ok(iterations) = iterations.parse::<usize>() {
                config.runner.benchmark_iterations = iterations;
            }
        }

        Ok(config)
    }

    pub fn validate(&self) -> Result<()> {
        if !self.implementations_dir.exists() {
            anyhow::bail!("Implementations directory does not exist: {:?}", self.implementations_dir);
        }

        if !self.specs_dir.exists() {
            anyhow::bail!("Specs directory does not exist: {:?}", self.specs_dir);
        }

        std::fs::create_dir_all(&self.results_dir)?;

        Ok(())
    }
}

fn create_default_implementations() -> HashMap<String, ImplementationConfig> {
    let mut implementations = HashMap::new();

    implementations.insert("javascript".to_string(), ImplementationConfig {
        name: "JavaScript".to_string(),
        setup_command: vec!["npm".to_string(), "install".to_string()],
        test_command: vec!["node".to_string(), "test-runner.js".to_string(), "test".to_string()],
        benchmark_command: vec!["node".to_string(), "test-runner.js".to_string(), "benchmark".to_string()],
        timeout_seconds: 300,
        env_vars: HashMap::new(),
    });

    implementations.insert("python".to_string(), ImplementationConfig {
        name: "Python".to_string(),
        setup_command: vec!["python".to_string(), "-m".to_string(), "pip".to_string(), "install".to_string(), "-r".to_string(), "requirements.txt".to_string()],
        test_command: vec!["python".to_string(), "test_runner.py".to_string(), "test".to_string()],
        benchmark_command: vec!["python".to_string(), "test_runner.py".to_string(), "benchmark".to_string()],
        timeout_seconds: 300,
        env_vars: HashMap::new(),
    });

    implementations.insert("java".to_string(), ImplementationConfig {
        name: "Java".to_string(),
        setup_command: vec!["mvn".to_string(), "compile".to_string()],
        test_command: vec!["mvn".to_string(), "exec:java".to_string(), "-Dexec.mainClass=org.fhirpath.comparison.TestRunner".to_string(), "-Dexec.args=test".to_string()],
        benchmark_command: vec!["mvn".to_string(), "exec:java".to_string(), "-Dexec.mainClass=org.fhirpath.comparison.TestRunner".to_string(), "-Dexec.args=benchmark".to_string()],
        timeout_seconds: 600,
        env_vars: HashMap::new(),
    });

    implementations.insert("csharp".to_string(), ImplementationConfig {
        name: "C#".to_string(),
        setup_command: vec!["dotnet".to_string(), "restore".to_string()],
        test_command: vec!["dotnet".to_string(), "run".to_string(), "--".to_string(), "test".to_string()],
        benchmark_command: vec!["dotnet".to_string(), "run".to_string(), "--".to_string(), "benchmark".to_string()],
        timeout_seconds: 300,
        env_vars: HashMap::new(),
    });

    implementations.insert("rust".to_string(), ImplementationConfig {
        name: "Rust".to_string(),
        setup_command: vec!["cargo".to_string(), "build".to_string()],
        test_command: vec!["cargo".to_string(), "run".to_string(), "--".to_string(), "test".to_string()],
        benchmark_command: vec!["cargo".to_string(), "run".to_string(), "--".to_string(), "benchmark".to_string()],
        timeout_seconds: 300,
        env_vars: HashMap::new(),
    });

    implementations.insert("go".to_string(), ImplementationConfig {
        name: "Go".to_string(),
        setup_command: vec!["go".to_string(), "mod".to_string(), "tidy".to_string()],
        test_command: vec!["go".to_string(), "run".to_string(), "main.go".to_string(), "test".to_string()],
        benchmark_command: vec!["go".to_string(), "run".to_string(), "main.go".to_string(), "benchmark".to_string()],
        timeout_seconds: 300,
        env_vars: HashMap::new(),
    });

    implementations.insert("clojure".to_string(), ImplementationConfig {
        name: "Clojure".to_string(),
        setup_command: vec!["clojure".to_string(), "-P".to_string()],
        test_command: vec!["clojure".to_string(), "-M".to_string(), "-m".to_string(), "test-runner".to_string()],
        benchmark_command: vec!["clojure".to_string(), "-M".to_string(), "-m".to_string(), "test-runner".to_string(), "benchmark".to_string()],
        timeout_seconds: 600,
        env_vars: HashMap::new(),
    });

    implementations
}
