use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Decode the input's audio track to a small mono PCM stream and reduce it to
/// `buckets` normalized peak amplitudes (0.0..=1.0) for rendering a waveform.
///
/// We resample to 2 kHz mono s16le — far more than enough to capture the shape
/// of the waveform while keeping the piped output tiny (≈14 MB for a 1-hour
/// clip). The reduction to peaks happens here so the frontend only receives a
/// short `Vec<f32>`. Spawned from Rust (like `probe_file`), so it isn't subject
/// to the JS shell-scope arg allowlist.
#[tauri::command]
pub async fn extract_waveform(
    path: String,
    buckets: usize,
    app: AppHandle,
) -> Result<Vec<f32>, String> {
    let buckets = buckets.clamp(16, 1024);

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-v", "quiet",
            "-nostdin",
            "-i", &path,
            "-vn",            // ignore video
            "-ac", "1",       // mono
            "-ar", "2000",    // 2 kHz is plenty for a waveform shape
            "-f", "s16le",    // raw little-endian 16-bit PCM
            "-",              // to stdout
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        // Most commonly: the file has no audio stream.
        return Err("no decodable audio track".into());
    }

    let bytes = output.stdout;
    if bytes.len() < 2 {
        return Err("no audio samples".into());
    }

    let samples: Vec<i16> = bytes
        .chunks_exact(2)
        .map(|c| i16::from_le_bytes([c[0], c[1]]))
        .collect();

    let per = ((samples.len() as f64) / (buckets as f64)).ceil() as usize;
    let per = per.max(1);

    // RMS (average energy) per bucket rather than the peak: a long bucket window
    // almost always contains a near-full-scale transient, so peak-per-bucket
    // saturates to ~1.0 everywhere. RMS tracks how loud each slice actually is,
    // giving real dynamics between quiet and loud sections.
    let mut peaks: Vec<f32> = Vec::with_capacity(buckets);
    for i in 0..buckets {
        let start = i * per;
        if start >= samples.len() {
            peaks.push(0.0);
            continue;
        }
        let end = ((i + 1) * per).min(samples.len());
        let slice = &samples[start..end];
        let sum_sq: f64 = slice
            .iter()
            .map(|&s| {
                let v = s as f64 / 32768.0;
                v * v
            })
            .sum();
        let rms = (sum_sq / slice.len() as f64).sqrt();
        peaks.push(rms as f32);
    }

    // Normalize to the loudest bucket so quiet tracks still fill the track, then
    // apply a gentle gamma (<1) to lift low-mid values — RMS is otherwise quite
    // small, which would render as a near-flat line.
    let max = peaks.iter().copied().fold(0.0f32, f32::max);
    if max > 0.0 {
        for p in peaks.iter_mut() {
            *p = (*p / max).powf(0.7);
        }
    }

    Ok(peaks)
}
