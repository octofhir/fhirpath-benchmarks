use anyhow::Result;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{System, Pid, ProcessesToUpdate};

pub fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

pub fn get_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

pub fn cleanup_result_files(results_dir: &PathBuf, language: &str, result_type: &str) -> Result<()> {
    // Clean up both timestamped files (legacy) and non-timestamped files (current)
    let timestamped_pattern = format!("{}_{}_*.json", language, result_type);
    let timestamped_pattern_path = results_dir.join(timestamped_pattern);

    let simple_filename = format!("{}_{}.json", language, result_type);
    let simple_file_path = results_dir.join(&simple_filename);

    // Remove timestamped files (legacy)
    if let Ok(entries) = glob::glob(&timestamped_pattern_path.to_string_lossy()) {
        for entry in entries {
            if let Ok(path) = entry {
                match std::fs::remove_file(&path) {
                    Ok(_) => println!("🗑️  Removed old timestamped result file: {}", path.display()),
                    Err(e) => println!("⚠️  Could not remove {}: {}", path.display(), e),
                }
            }
        }
    }

    // Remove simple non-timestamped file if it exists
    if simple_file_path.exists() {
        match std::fs::remove_file(&simple_file_path) {
            Ok(_) => println!("🗑️  Removed existing result file: {}", simple_file_path.display()),
            Err(e) => println!("⚠️  Could not remove {}: {}", simple_file_path.display(), e),
        }
    }

    Ok(())
}

pub fn get_system_info() -> SystemInfo {
    let mut system = System::new_all();
    system.refresh_all();

    SystemInfo {
        os: System::name().unwrap_or_else(|| "Unknown".to_string()),
        arch: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_count: system.cpus().len(),
        total_memory: system.total_memory(),
        available_memory: system.available_memory(),
    }
}

pub fn get_process_stats(pid: u32) -> Option<ProcessStats> {
    let mut system = System::new();
    let pid = Pid::from(pid as usize);
    system.refresh_processes(ProcessesToUpdate::Some(&[pid.into()]), true);

    if let Some(process) = system.process(pid) {
        Some(ProcessStats {
            cpu_usage: process.cpu_usage(),
            memory_usage: process.memory(),
            virtual_memory: process.virtual_memory(),
        })
    } else {
        None
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub cpu_count: usize,
    pub total_memory: u64,
    pub available_memory: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProcessStats {
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub virtual_memory: u64,
}

pub fn find_virtual_env_python(impl_dir: &PathBuf) -> Option<PathBuf> {
    let venv_dirs = ["venv", ".venv", "env", ".env"];

    for venv_dir in &venv_dirs {
        let venv_path = impl_dir.join(venv_dir);
        if venv_path.exists() {
            let python_path = if cfg!(windows) {
                venv_path.join("Scripts").join("python.exe")
            } else {
                venv_path.join("bin").join("python")
            };

            if python_path.exists() {
                return Some(python_path);
            }
        }
    }

    None
}
