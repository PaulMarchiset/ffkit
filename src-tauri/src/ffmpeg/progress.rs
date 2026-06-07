use std::collections::HashMap;

#[derive(Debug, Default)]
pub struct ProgressUpdate {
    pub frame: u64,
    pub fps: f64,
    pub speed: f64,
    /// Encoded position in real milliseconds. Note ffmpeg's `-progress` output
    /// is normalized here from microseconds (see `parse_out_time_ms`).
    pub out_time_ms: i64,
    pub total_size: u64,
    pub done: bool,
}

/// ffmpeg's `-progress` output reports `out_time_us` and, confusingly,
/// `out_time_ms` — but BOTH are microseconds (`out_time_ms` is a long-standing
/// ffmpeg misnomer). Normalize to real milliseconds so it can be compared
/// against the job's duration (which is in ms). Prefers `out_time_us`.
fn parse_out_time_ms(map: &HashMap<&str, &str>) -> i64 {
    map.get("out_time_us")
        .or_else(|| map.get("out_time_ms"))
        .and_then(|v| v.parse::<i64>().ok())
        .map(|micros| micros / 1000)
        .unwrap_or(0)
}

pub fn parse_progress_block(block: &str) -> ProgressUpdate {
    let map: HashMap<&str, &str> = block
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(2, '=');
            let key = parts.next()?.trim();
            let val = parts.next()?.trim();
            Some((key, val))
        })
        .collect();

    ProgressUpdate {
        frame: map.get("frame").and_then(|v| v.parse().ok()).unwrap_or(0),
        fps: map.get("fps").and_then(|v| v.parse().ok()).unwrap_or(0.0),
        speed: map
            .get("speed")
            .and_then(|v| v.trim_end_matches('x').parse().ok())
            .unwrap_or(0.0),
        out_time_ms: parse_out_time_ms(&map),
        total_size: map
            .get("total_size")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0),
        done: map.get("progress").map(|v| *v == "end").unwrap_or(false),
    }
}

/// Accumulates progress output and yields complete blocks.
pub struct ProgressAccumulator {
    buf: String,
}

impl ProgressAccumulator {
    pub fn new() -> Self {
        ProgressAccumulator { buf: String::new() }
    }

    /// Feed raw bytes; returns any complete progress blocks found.
    pub fn feed(&mut self, bytes: &[u8]) -> Vec<ProgressUpdate> {
        self.buf.push_str(&String::from_utf8_lossy(bytes));
        let mut results = Vec::new();

        loop {
            // A block ends at the newline after "progress=..."
            if let Some(prog_pos) = self.buf.find("\nprogress=") {
                if let Some(nl) = self.buf[prog_pos + 1..].find('\n') {
                    let block_end = prog_pos + 1 + nl + 1;
                    let block = self.buf[..block_end].to_string();
                    self.buf.drain(..block_end);
                    results.push(parse_progress_block(&block));
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ffmpeg reports out_time in microseconds under both keys; we expect real ms.
    #[test]
    fn out_time_is_normalized_from_microseconds_to_milliseconds() {
        let block = "frame=50\nfps=25.0\nspeed=2.0x\nout_time_us=2000000\nout_time_ms=2000000\nout_time=00:00:02.000000\ntotal_size=1024\nprogress=continue\n";
        let u = parse_progress_block(block);
        assert_eq!(u.out_time_ms, 2000); // 2_000_000 µs -> 2000 ms
        assert_eq!(u.frame, 50);
        assert_eq!(u.speed, 2.0);
        assert_eq!(u.total_size, 1024);
        assert!(!u.done);
    }

    #[test]
    fn progress_end_marks_done() {
        let block = "out_time_us=0\nprogress=end\n";
        assert!(parse_progress_block(block).done);
    }
}
