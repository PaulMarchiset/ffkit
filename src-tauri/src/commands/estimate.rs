use crate::commands::jobs::resolve_encoder;
use crate::ffmpeg::presets::preset_args;
use crate::ffmpeg::runner::get_duration_ms;
use crate::state::AppState;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Length (seconds) of each sample window encoded when estimating output size.
const SAMPLE_SECS: f64 = 2.0;

/// Fractions of the clip duration at which sample windows are centered. Spreading
/// the samples across the clip captures scene-complexity variance that a single
/// middle window misses (e.g. a static centre but action at the ends).
const SAMPLE_POSITIONS: [f64; 3] = [0.25, 0.5, 0.75];

/// Empirical per-preset correction applied to the extrapolated size. Each sample
/// window is forced to start on an IDR frame and carries fixed mp4 mux overhead,
/// both of which bias the raw extrapolation high; this trims it back toward
/// observed full-encode sizes. The bias varies with CRF, so it's tuned per
/// preset (matching `preset_args`: low / lossless / else medium). Tune against
/// real conversions as needed.
fn calibration_factor(quality: &str) -> f64 {
    match quality {
        "low" => 0.79,      // CRF 30
        "lossless" => 0.75, // CRF 18
        _ => 0.63,          // CRF 23 (medium / default)
    }
}

/// Estimate the final output size (bytes) for a preset conversion, without
/// running the full job. Because the presets are CRF-based (variable bitrate),
/// the size can't be derived from settings alone — so we encode a few short
/// slices spread across the clip at the *real* settings, average their bitrate,
/// extrapolate to the full duration, and apply an empirical calibration. For
/// clips shorter than a single sample window we encode the whole thing, making
/// the estimate exact.
#[tauri::command]
pub async fn estimate_output_size(
    path: String,
    quality: String,
    total_duration_ms: Option<i64>,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<u64, String> {
    let duration_ms = match total_duration_ms {
        Some(ms) if ms > 0 => ms,
        _ => get_duration_ms(&app, &path)
            .await
            .ok_or_else(|| "could not determine duration".to_string())?,
    };
    let duration_secs = duration_ms as f64 / 1000.0;
    if duration_secs <= 0.0 {
        return Err("clip has no duration".to_string());
    }

    let encoder = resolve_encoder(&state).await;
    let sample_secs = SAMPLE_SECS.min(duration_secs);

    // Whole clip fits in one window → encode it once for an exact figure. No
    // extrapolation happens, so the calibration (which only corrects extrapolation
    // bias) is deliberately not applied.
    if sample_secs >= duration_secs {
        return encode_sample(&app, &path, &quality, &encoder, 0.0, sample_secs).await;
    }

    // Average the per-window bitrate (bytes/sec) across the spread of samples,
    // then extrapolate to the full duration.
    let mut bitrate_sum = 0.0_f64;
    for frac in SAMPLE_POSITIONS {
        let start_secs =
            (duration_secs * frac - sample_secs / 2.0).clamp(0.0, duration_secs - sample_secs);
        let bytes = encode_sample(&app, &path, &quality, &encoder, start_secs, sample_secs).await?;
        bitrate_sum += bytes as f64 / sample_secs;
    }
    let avg_bitrate = bitrate_sum / SAMPLE_POSITIONS.len() as f64;

    Ok((avg_bitrate * duration_secs * calibration_factor(&quality)) as u64)
}

/// Encode a single `sample_secs` slice starting at `start_secs` with the real
/// preset args and return its byte size. The temp path is unique so concurrent
/// estimates (rapid quality switches) don't clobber each other; always .mp4 to
/// match the preset's faststart+aac muxing.
async fn encode_sample(
    app: &AppHandle,
    path: &str,
    quality: &str,
    encoder: &str,
    start_secs: f64,
    sample_secs: f64,
) -> Result<u64, String> {
    let temp = std::env::temp_dir().join(format!("ffkit-estimate-{}.mp4", uuid::Uuid::new_v4()));

    let mut args = vec![
        "-y".to_string(),
        "-ss".to_string(),
        format!("{start_secs}"),
        "-i".to_string(),
        path.to_string(),
        "-t".to_string(),
        format!("{sample_secs}"),
    ];
    args.extend(preset_args(quality, encoder));
    args.push(temp.to_string_lossy().to_string());

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(&args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let result = if output.status.success() {
        std::fs::metadata(&temp)
            .map(|meta| meta.len())
            .map_err(|e| format!("sample output missing: {e}"))
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("ffmpeg failed: {err}"))
    };

    let _ = std::fs::remove_file(&temp);
    result
}
