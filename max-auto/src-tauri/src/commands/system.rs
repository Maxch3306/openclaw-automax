use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub home_dir: String,
    pub maxauto_dir: String,
}

#[derive(Debug, Serialize)]
pub struct NodeStatus {
    pub available: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub source: Option<String>, // "local" or "system"
}

#[derive(Debug, Serialize)]
pub struct OpenclawStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

fn maxauto_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not determine home directory")
        .join(".openclaw-maxauto")
}

fn local_node_path() -> PathBuf {
    if cfg!(windows) {
        maxauto_dir().join("node").join("node.exe")
    } else {
        maxauto_dir().join("node").join("bin").join("node")
    }
}

async fn get_node_version(node_path: &str) -> Option<String> {
    let output = tokio::process::Command::new(node_path)
        .arg("--version")
        .output()
        .await
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

#[tauri::command]
pub async fn get_platform_info() -> Result<PlatformInfo, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let ma_dir = maxauto_dir();

    Ok(PlatformInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        home_dir: home.to_string_lossy().to_string(),
        maxauto_dir: ma_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn check_node() -> Result<NodeStatus, String> {
    // Check local node first
    let local = local_node_path();
    if local.exists() {
        let path_str = local.to_string_lossy().to_string();
        let version = get_node_version(&path_str).await;
        return Ok(NodeStatus {
            available: true,
            version,
            path: Some(path_str),
            source: Some("local".into()),
        });
    }

    // Check system node
    let system_node = if cfg!(windows) { "node.exe" } else { "node" };
    if let Some(version) = get_node_version(system_node).await {
        // Parse version to check >= 22
        let major: Option<u32> = version
            .trim_start_matches('v')
            .split('.')
            .next()
            .and_then(|s| s.parse().ok());

        if let Some(major) = major {
            if major >= 22 {
                return Ok(NodeStatus {
                    available: true,
                    version: Some(version),
                    path: Some(system_node.into()),
                    source: Some("system".into()),
                });
            }
        }
    }

    Ok(NodeStatus {
        available: false,
        version: None,
        path: None,
        source: None,
    })
}

#[tauri::command]
pub async fn check_openclaw() -> Result<OpenclawStatus, String> {
    let entry = maxauto_dir()
        .join("openclaw")
        .join("node_modules")
        .join("openclaw")
        .join("openclaw.mjs");

    if !entry.exists() {
        return Ok(OpenclawStatus {
            installed: false,
            version: None,
            path: None,
        });
    }

    // Try to get version
    let node = local_node_path();
    let node_cmd = if node.exists() {
        node.to_string_lossy().to_string()
    } else {
        (if cfg!(windows) { "node.exe" } else { "node" }).to_string()
    };

    let version = tokio::process::Command::new(&node_cmd)
        .arg(&entry)
        .arg("--version")
        .output()
        .await
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        });

    Ok(OpenclawStatus {
        installed: true,
        version,
        path: Some(entry.to_string_lossy().to_string()),
    })
}
