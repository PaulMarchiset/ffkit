use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuPresence {
    pub nvidia: bool,
    pub intel: bool,
    pub amd: bool,
    pub names: Vec<String>,
}

pub fn detect_gpus() -> GpuPresence {
    let mut g = GpuPresence::default();

    if let Some(name) = nvidia_smi_first_gpu() {
        g.nvidia = true;
        g.names.push(name);
    }

    #[cfg(windows)]
    {
        if let Some(text) = run_quiet("powershell", &[
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name",
        ]) {
            classify_vendor_text(&text, &mut g);
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(text) = run_quiet("lspci", &[]) {
            for line in text.lines() {
                let lower = line.to_lowercase();
                if lower.contains("vga") || lower.contains("3d controller") || lower.contains("display controller") {
                    classify_vendor_text(line, &mut g);
                }
            }
        }
    }

    g
}

fn classify_vendor_text(text: &str, g: &mut GpuPresence) {
    let lower = text.to_lowercase();
    if lower.contains("nvidia") {
        g.nvidia = true;
    }
    if lower.contains("intel") {
        g.intel = true;
    }
    if lower.contains("amd") || lower.contains("radeon") || lower.contains("ati ") {
        g.amd = true;
    }
    for line in text.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() && !g.names.iter().any(|n| n == trimmed) {
            g.names.push(trimmed.to_string());
        }
    }
}

fn nvidia_smi_first_gpu() -> Option<String> {
    let out = run_quiet(
        "nvidia-smi",
        &["--query-gpu=name", "--format=csv,noheader"],
    )?;
    let first = out.lines().next()?.trim().to_string();
    if first.is_empty() {
        None
    } else {
        Some(first)
    }
}

fn run_quiet(program: &str, args: &[&str]) -> Option<String> {
    let mut cmd = Command::new(program);
    cmd.args(args);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let out = cmd.output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).to_string();
    if s.trim().is_empty() {
        None
    } else {
        Some(s)
    }
}
