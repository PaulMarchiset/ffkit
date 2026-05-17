/// Build the video/audio codec arguments for a given quality preset and encoder.
pub fn preset_args(quality: &str, encoder: &str) -> Vec<String> {
    let is_software = matches!(encoder, "libx264" | "libx265");
    let (crf, sw_preset, audio_bitrate) = match quality {
        "low" => (30u32, "medium", "96k"),
        "lossless" => (18u32, "slow", "192k"),
        _ => (23u32, "medium", "128k"),
    };

    let mut args = codec_args(encoder, crf);

    if is_software {
        args.push("-preset".to_string());
        args.push(sw_preset.to_string());
    }

    args.extend([
        "-c:a".to_string(),
        "aac".to_string(),
        "-b:a".to_string(),
        audio_bitrate.to_string(),
        "-movflags".to_string(),
        "+faststart".to_string(),
    ]);

    args
}

fn codec_args(encoder: &str, crf: u32) -> Vec<String> {
    match encoder {
        "libx264" | "libx265" => vec![
            "-c:v".to_string(),
            encoder.to_string(),
            "-crf".to_string(),
            crf.to_string(),
        ],
        e if e.contains("nvenc") => vec![
            "-c:v".to_string(),
            e.to_string(),
            "-cq".to_string(),
            crf.to_string(),
        ],
        e if e.contains("videotoolbox") => {
            let q = match crf {
                0..=18 => 80u32,
                19..=23 => 65,
                _ => 50,
            };
            vec![
                "-c:v".to_string(),
                e.to_string(),
                "-q:v".to_string(),
                q.to_string(),
            ]
        }
        e if e.contains("qsv") => vec![
            "-c:v".to_string(),
            e.to_string(),
            "-global_quality".to_string(),
            crf.to_string(),
        ],
        e if e.contains("amf") => vec![
            "-c:v".to_string(),
            e.to_string(),
            "-qp_i".to_string(),
            crf.to_string(),
            "-qp_p".to_string(),
            crf.to_string(),
            "-qp_b".to_string(),
            crf.to_string(),
        ],
        e if e.contains("vaapi") => vec![
            "-c:v".to_string(),
            e.to_string(),
            "-qp".to_string(),
            crf.to_string(),
        ],
        e => vec!["-c:v".to_string(), e.to_string()],
    }
}
