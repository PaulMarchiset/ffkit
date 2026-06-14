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
    // Richer detail surfaced in the media-info modal (and `fps` also feeds the
    // instant size-estimate range). All optional — absent for audio-only files
    // or when ffprobe doesn't report the field.
    pub fps: Option<f64>,
    pub pix_fmt: Option<String>,
    pub video_bitrate: Option<u64>,
    pub video_profile: Option<String>,
    pub audio_channels: Option<u32>,
    pub audio_sample_rate: Option<u32>,
    pub audio_bitrate: Option<u64>,
}

/// Parse an ffprobe rational like "30000/1001" or "25/1" into frames per second.
fn parse_fps(value: Option<&str>) -> Option<f64> {
    let s = value?;
    let (num, den) = s.split_once('/')?;
    let num: f64 = num.parse().ok()?;
    let den: f64 = den.parse().ok()?;
    if den == 0.0 {
        return None;
    }
    Some(num / den)
}

/// Parse a JSON value that ffprobe may encode as either a string or a number.
fn parse_u64(value: &serde_json::Value) -> Option<u64> {
    value
        .as_str()
        .and_then(|s| s.parse().ok())
        .or_else(|| value.as_u64())
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
        fps: video.and_then(|s| parse_fps(s["r_frame_rate"].as_str())),
        pix_fmt: video
            .and_then(|s| s["pix_fmt"].as_str())
            .map(|s| s.to_string()),
        video_bitrate: video.and_then(|s| parse_u64(&s["bit_rate"])),
        video_profile: video
            .and_then(|s| s["profile"].as_str())
            .map(|s| s.to_string()),
        audio_channels: audio
            .and_then(|s| s["channels"].as_u64())
            .map(|v| v as u32),
        audio_sample_rate: audio
            .and_then(|s| parse_u64(&s["sample_rate"]))
            .map(|v| v as u32),
        audio_bitrate: audio.and_then(|s| parse_u64(&s["bit_rate"])),
    })
}
