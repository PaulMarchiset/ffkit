use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

use crate::ffmpeg::gpu::{detect_gpus, GpuPresence};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HwEncoder {
    pub name: String,
    pub codec: String,
    /// True if a synthetic probe encode succeeded. False means the encoder
    /// is included on hardware-presence grounds only (probe flaked) — see `warning`.
    pub probed: bool,
    pub warning: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderList {
    pub available: Vec<HwEncoder>,
    pub best_h264: Option<String>,
    pub best_h265: Option<String>,
    pub gpus: GpuPresence,
    pub warnings: Vec<String>,
}

#[derive(Clone, Copy)]
enum Vendor {
    Nvidia,
    Intel,
    Amd,
    Apple,
    LinuxOpen,
}

const HW_CANDIDATES: &[(&str, &str, Vendor)] = &[
    ("h264_nvenc",        "h264", Vendor::Nvidia),
    ("h264_videotoolbox", "h264", Vendor::Apple),
    ("h264_qsv",          "h264", Vendor::Intel),
    ("h264_amf",          "h264", Vendor::Amd),
    ("h264_vaapi",        "h264", Vendor::LinuxOpen),
    ("hevc_nvenc",        "hevc", Vendor::Nvidia),
    ("hevc_videotoolbox", "hevc", Vendor::Apple),
    ("hevc_qsv",          "hevc", Vendor::Intel),
    ("hevc_amf",          "hevc", Vendor::Amd),
    ("hevc_vaapi",        "hevc", Vendor::LinuxOpen),
];

const H264_PRIORITY: &[&str] = &[
    "h264_nvenc", "h264_videotoolbox", "h264_qsv", "h264_amf", "h264_vaapi",
];
const H265_PRIORITY: &[&str] = &[
    "hevc_nvenc", "hevc_videotoolbox", "hevc_qsv", "hevc_amf", "hevc_vaapi",
];

pub async fn detect_hw_encoders(app: &AppHandle) -> EncoderList {
    let known = get_available_encoder_names(app).await;
    let gpus = detect_gpus();
    let mut available = Vec::new();
    let mut warnings = Vec::new();

    for (name, codec, vendor) in HW_CANDIDATES {
        if !known.iter().any(|n| n == name) {
            continue;
        }

        let probe = probe_encoder(app, name).await;
        if probe.ok {
            available.push(HwEncoder {
                name: name.to_string(),
                codec: codec.to_string(),
                probed: true,
                warning: None,
            });
            continue;
        }

        // Probe failed — but if the vendor's hardware is present, the probe is
        // likely flaking (hybrid graphics, missing CUDA init in the sidecar process,
        // etc.) rather than the encoder being genuinely unavailable. Trust the
        // hardware and include it with a warning so the UI can explain itself.
        if hardware_present_for(*vendor, &gpus) {
            let reason = summarize_stderr(&probe.stderr);
            let warn = format!(
                "{} probe failed but {} hardware was detected — encoder kept based on hardware presence ({})",
                name,
                vendor_label(*vendor),
                reason
            );
            warnings.push(warn.clone());
            available.push(HwEncoder {
                name: name.to_string(),
                codec: codec.to_string(),
                probed: false,
                warning: Some(reason),
            });
        }
    }

    let best_h264 = H264_PRIORITY
        .iter()
        .find(|n| available.iter().any(|e| e.name == **n))
        .map(|s| s.to_string());

    let best_h265 = H265_PRIORITY
        .iter()
        .find(|n| available.iter().any(|e| e.name == **n))
        .map(|s| s.to_string());

    EncoderList {
        available,
        best_h264,
        best_h265,
        gpus,
        warnings,
    }
}

fn hardware_present_for(vendor: Vendor, gpus: &GpuPresence) -> bool {
    match vendor {
        Vendor::Nvidia => gpus.nvidia,
        Vendor::Intel => gpus.intel,
        Vendor::Amd => gpus.amd,
        // VideoToolbox and VAAPI: we don't gate on detection; if the encoder is
        // compiled in and the probe fails, that's a real failure on those platforms.
        Vendor::Apple | Vendor::LinuxOpen => false,
    }
}

fn vendor_label(vendor: Vendor) -> &'static str {
    match vendor {
        Vendor::Nvidia => "NVIDIA",
        Vendor::Intel => "Intel",
        Vendor::Amd => "AMD",
        Vendor::Apple => "Apple",
        Vendor::LinuxOpen => "VAAPI",
    }
}

async fn get_available_encoder_names(app: &AppHandle) -> Vec<String> {
    let cmd = match app.shell().sidecar("ffmpeg") {
        Ok(s) => s.args(["-encoders", "-v", "quiet"]),
        Err(_) => return Vec::new(),
    };
    match cmd.output().await {
        Ok(out) => parse_encoder_list(&String::from_utf8_lossy(&out.stdout)),
        Err(_) => Vec::new(),
    }
}

fn parse_encoder_list(output: &str) -> Vec<String> {
    let mut in_section = false;
    let mut names = Vec::new();
    for line in output.lines() {
        if line.trim_start().starts_with("------") {
            in_section = true;
            continue;
        }
        if !in_section {
            continue;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // format: "V..... name  description"
        let mut parts = trimmed.splitn(3, char::is_whitespace);
        let _flags = parts.next();
        if let Some(name) = parts.next() {
            let name = name.trim();
            if !name.is_empty() {
                names.push(name.to_string());
            }
        }
    }
    names
}

struct ProbeResult {
    ok: bool,
    stderr: String,
}

async fn probe_encoder(app: &AppHandle, encoder: &str) -> ProbeResult {
    // NVENC requires a minimum frame size (~146x50 on H.264); QSV/AMF have their
    // own minimums too. 256x256 is safely above every HW encoder's floor and small
    // enough to probe in <100ms.
    let cmd = match app.shell().sidecar("ffmpeg") {
        Ok(s) => s.args([
            "-f", "lavfi",
            "-i", "color=black:s=256x256:d=0.04",
            "-frames:v", "1",
            "-c:v", encoder,
            "-f", "null",
            "-",
        ]),
        Err(e) => return ProbeResult { ok: false, stderr: format!("sidecar error: {e}") },
    };
    match cmd.output().await {
        Ok(out) => ProbeResult {
            ok: out.status.success(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
        },
        Err(e) => ProbeResult { ok: false, stderr: format!("spawn error: {e}") },
    }
}

/// Pull the most informative line out of ffmpeg's stderr — usually the last
/// non-empty line is the actual error. Cap at 200 chars so it fits in a tooltip.
fn summarize_stderr(stderr: &str) -> String {
    let last = stderr
        .lines()
        .rev()
        .map(|l| l.trim())
        .find(|l| !l.is_empty())
        .unwrap_or("probe returned non-zero exit");
    if last.chars().count() > 200 {
        let truncated: String = last.chars().take(200).collect();
        format!("{truncated}…")
    } else {
        last.to_string()
    }
}
