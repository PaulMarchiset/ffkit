//! Raw-mode ffmpeg argument construction.
//!
//! This is the single source of truth for turning an Advanced-mode command
//! template (with `{input}`/`{output}` placeholders) into the argument vector
//! handed to the ffmpeg sidecar. It used to live in the frontend
//! (src/lib/commandBuilder.ts + shellArgs.ts); it now lives here so the backend
//! owns and validates exactly what it spawns. Those TS functions are retained
//! only as the frozen parity reference (see tests/unit/rawArgs.parity.test.ts).

/// Split a command string into tokens, honoring `'…'` / `"…"` quoting.
/// Quote characters are removed; runs of spaces/tabs separate tokens and
/// collapse; empty tokens are dropped. Mirrors the TS `parseCommandArgs`.
fn tokenize(cmd: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quote = false;
    let mut quote_char = '\0';

    for ch in cmd.chars() {
        if in_quote {
            if ch == quote_char {
                in_quote = false;
            } else {
                current.push(ch);
            }
        } else if ch == '"' || ch == '\'' {
            in_quote = true;
            quote_char = ch;
        } else if ch == ' ' || ch == '\t' {
            if !current.is_empty() {
                args.push(std::mem::take(&mut current));
            }
        } else {
            current.push(ch);
        }
    }
    if !current.is_empty() {
        args.push(current);
    }
    args
}

/// Drop a leading `ffmpeg` token (case-insensitive) — args go straight to the
/// binary. Mirrors the TS `stripLeadingFfmpeg`.
fn strip_leading_ffmpeg(mut args: Vec<String>) -> Vec<String> {
    if args
        .first()
        .map(|s| s.eq_ignore_ascii_case("ffmpeg"))
        .unwrap_or(false)
    {
        args.remove(0);
    }
    args
}

/// Build the ffmpeg arg vector from a raw command template.
///
/// The template is tokenized FIRST, then `{input}`/`{output}` are substituted
/// into the resulting tokens. This is the fix for paths containing spaces: a
/// substituted path lands inside a single, already-formed token, so it stays one
/// argument (the old TS pipeline substituted first and then tokenized, which
/// split spaced paths — see the "windows paths WITH spaces" case in the
/// fixture, where `expected` is the pre-fix output and `rustExpected` the fix).
///
/// Substitution is a literal, sequential replace (input then output) — unlike
/// JS `String.replace`, `$`-patterns in the paths are NOT interpreted. That is a
/// deliberate, documented divergence from the old TS behavior (see the `$` cases
/// in the parity fixture).
pub fn build_raw_args(template: &str, input: &str, output: &str) -> Vec<String> {
    let substituted: Vec<String> = tokenize(template)
        .into_iter()
        .map(|tok| tok.replace("{input}", input).replace("{output}", output))
        .collect();
    strip_leading_ffmpeg(substituted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    // Repo-root fixture shared with the TS reference test.
    const FIXTURE: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tests/fixtures/ffmpeg-raw-args-cases.json"
    ));

    fn as_strings(v: &Value) -> Vec<String> {
        v.as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap().to_string())
            .collect()
    }

    /// What Rust must produce for a build case: `rustExpected` when present
    /// (intentional divergence / space fix), otherwise the frozen TS `expected`.
    fn want(case: &Value) -> Vec<String> {
        as_strings(case.get("rustExpected").unwrap_or(&case["expected"]))
    }

    #[test]
    fn tokenizer_parity() {
        let data: Value = serde_json::from_str(FIXTURE).unwrap();
        for case in data["tokenizer"].as_array().unwrap() {
            let name = case["name"].as_str().unwrap();
            let input = case["input"].as_str().unwrap();
            assert_eq!(
                tokenize(input),
                as_strings(&case["expected"]),
                "tokenizer case: {name}"
            );
        }
    }

    #[test]
    fn build_raw_args_parity() {
        let data: Value = serde_json::from_str(FIXTURE).unwrap();
        for case in data["buildRawArgs"].as_array().unwrap() {
            let name = case["name"].as_str().unwrap();
            let template = case["template"].as_str().unwrap();
            let input = case["input"].as_str().unwrap();
            let output = case["output"].as_str().unwrap();
            assert_eq!(
                build_raw_args(template, input, output),
                want(case),
                "buildRawArgs case: {name}"
            );
        }
    }
}
