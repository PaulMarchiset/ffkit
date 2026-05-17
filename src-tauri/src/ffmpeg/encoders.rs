use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HwEncoder {
    pub name: String,
    pub codec: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderList {
    pub available: Vec<HwEncoder>,
    pub best_h264: Option<String>,
    pub best_h265: Option<String>,
}

const HW_CANDIDATES: &[(&str, &str)] = &[
    ("h264_nvenc", "h264"),
    ("h264_videotoolbox", "h264"),
    ("h264_qsv", "h264"),
    ("h264_amf", "h264"),
    ("h264_vaapi", "h264"),
    ("hevc_nvenc", "hevc"),
    ("hevc_videotoolbox", "hevc"),
    ("hevc_qsv", "hevc"),
    ("hevc_amf", "hevc"),
    ("hevc_vaapi", "hevc"),
];

const H264_PRIORITY: &[&str] = &[
    "h264_nvenc", "h264_videotoolbox", "h264_qsv", "h264_amf", "h264_vaapi",
];
const H265_PRIORITY: &[&str] = &[
    "hevc_nvenc", "hevc_videotoolbox", "hevc_qsv", "hevc_amf", "hevc_vaapi",
];

pub async fn detect_hw_encoders(app: &AppHandle) -> EncoderList {
    let known = get_available_encoder_names(app).await;
    let mut available = Vec::new();

    for (name, codec) in HW_CANDIDATES {
        if known.iter().any(|n| n == name) && probe_encoder(app, name).await {
            available.push(HwEncoder {
                name: name.to_string(),
                codec: codec.to_string(),
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

    EncoderList { available, best_h264, best_h265 }
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

async fn probe_encoder(app: &AppHandle, encoder: &str) -> bool {
    let cmd = match app.shell().sidecar("ffmpeg") {
        Ok(s) => s.args([
            "-f", "lavfi",
            "-i", "color=black:s=64x64:d=0.1",
            "-frames:v", "1",
            "-c:v", encoder,
            "-f", "null",
            "-",
        ]),
        Err(_) => return false,
    };
    match cmd.output().await {
        Ok(out) => out.status.success(),
        Err(_) => false,
    }
}
