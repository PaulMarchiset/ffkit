use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub bitrate: Option<u64>,
    pub container: Option<String>,
}

#[tauri::command]
pub async fn probe_file(path: String, app: AppHandle) -> Result<FileInfo, String> {
    let cmd = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| e.to_string())?
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            &path,
        ]);

    let output = cmd.output().await.map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {err}"));
    }

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;

    let format = &json["format"];
    let streams = json["streams"].as_array().cloned().unwrap_or_default();

    let video = streams.iter().find(|s| s["codec_type"] == "video");
    let audio = streams.iter().find(|s| s["codec_type"] == "audio");

    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    Ok(FileInfo {
        path: path.clone(),
        name,
        size: format["size"]
            .as_str()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0),
        duration: format["duration"]
            .as_str()
            .and_then(|s| s.parse().ok()),
        width: video.and_then(|s| s["width"].as_u64()).map(|v| v as u32),
        height: video.and_then(|s| s["height"].as_u64()).map(|v| v as u32),
        video_codec: video
            .and_then(|s| s["codec_name"].as_str())
            .map(|s| s.to_string()),
        audio_codec: audio
            .and_then(|s| s["codec_name"].as_str())
            .map(|s| s.to_string()),
        bitrate: format["bit_rate"]
            .as_str()
            .and_then(|s| s.parse().ok()),
        container: format["format_name"]
            .as_str()
            .map(|s| s.split(',').next().unwrap_or(s).to_string()),
    })
}
