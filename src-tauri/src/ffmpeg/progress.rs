use std::collections::HashMap;

#[derive(Debug, Default)]
pub struct ProgressUpdate {
    pub frame: u64,
    pub fps: f64,
    pub speed: f64,
    pub out_time_ms: i64,
    pub total_size: u64,
    pub done: bool,
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
        out_time_ms: map
            .get("out_time_ms")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0),
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
