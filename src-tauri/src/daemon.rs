use crate::tool::{build_serve_args, resolve_tool_invocation, settings_key, ConnectionSettings};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;

const READY_TIMEOUT: Duration = Duration::from_secs(600);
const COMMAND_TIMEOUT: Duration = Duration::from_secs(600);

struct DaemonState {
    key: String,
    child: Child,
    line_rx: mpsc::Receiver<String>,
}

static DAEMON: OnceLock<Mutex<Option<DaemonState>>> = OnceLock::new();
static SESSION_GENERATION: Mutex<u64> = Mutex::new(0);

fn daemon_mutex() -> &'static Mutex<Option<DaemonState>> {
    DAEMON.get_or_init(|| Mutex::new(None))
}

fn bump_generation() -> u64 {
    let mut generation = SESSION_GENERATION.lock().expect("generation lock");
    *generation += 1;
    *generation
}

fn current_generation() -> u64 {
    *SESSION_GENERATION.lock().expect("generation lock")
}

fn dispose_daemon() {
    let mut guard = daemon_mutex().lock().expect("daemon lock");
    if let Some(mut state) = guard.take() {
        let _ = state.child.kill();
        let _ = state.child.wait();
    }
}

fn wait_for_line(rx: &mpsc::Receiver<String>, timeout: Duration) -> Result<String, String> {
    match rx.recv_timeout(timeout) {
        Ok(line) => Ok(line),
        Err(RecvTimeoutError::Timeout) => {
            Err("efvibe daemon timed out waiting for a response.".to_string())
        }
        Err(RecvTimeoutError::Disconnected) => Err("efvibe daemon stopped.".to_string()),
    }
}

fn parse_serve_error(line: &str) -> Option<String> {
    let payload: serde_json::Value = serde_json::from_str(line).ok()?;
    if payload.get("type")?.as_str()? == "error" {
        return Some(
            payload
                .get("message")
                .and_then(|value| value.as_str())
                .unwrap_or("efvibe daemon error.")
                .to_string(),
        );
    }

    None
}

fn write_request_and_wait(
    child: &mut Child,
    rx: &mpsc::Receiver<String>,
    request_json: &str,
    timeout: Duration,
) -> Result<String, String> {
    let stdin = child
        .stdin
        .as_mut()
        .ok_or_else(|| "efvibe daemon stdin unavailable.".to_string())?;

    stdin
        .write_all(format!("{request_json}\n").as_bytes())
        .map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())?;

    let line = wait_for_line(rx, timeout)?;
    if let Some(error) = parse_serve_error(&line) {
        return Err(error);
    }

    Ok(line)
}

fn ensure_daemon_ready(
    settings: &ConnectionSettings,
    search_directory: &Path,
    cwd: &Path,
) -> Result<(), String> {
    let key = settings_key(settings, search_directory, cwd);
    {
        let guard = daemon_mutex().lock().expect("daemon lock");
        if let Some(state) = guard.as_ref() {
            if state.key == key {
                return Ok(());
            }
        }
    }

    dispose_daemon();

    let invocation = resolve_tool_invocation(
        search_directory,
        &settings.tool_path,
        &settings.dotnet_framework,
    );
    let mut args = invocation.prefix_args().to_vec();
    args.extend(build_serve_args(settings, Some(search_directory)));

    let mut child = Command::new(invocation.command())
        .args(&args)
        .current_dir(cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start efvibe serve: {error}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "efvibe daemon stdout unavailable.".to_string())?;

    let (line_tx, line_rx) = mpsc::channel();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if line_tx.send(trimmed.to_string()).is_err() {
                break;
            }
        }
    });

    let ready_line = wait_for_line(&line_rx, READY_TIMEOUT)?;
    let payload: serde_json::Value =
        serde_json::from_str(&ready_line).map_err(|_| format!("Unexpected serve handshake: {ready_line}"))?;

    match payload.get("type").and_then(|value| value.as_str()) {
        Some("ready") => {}
        Some("error") => {
            let message = payload
                .get("message")
                .and_then(|value| value.as_str())
                .unwrap_or("efvibe serve failed to start.");
            return Err(message.to_string());
        }
        _ => return Err(format!("Unexpected serve handshake: {ready_line}")),
    }

    let mut guard = daemon_mutex().lock().expect("daemon lock");
    *guard = Some(DaemonState {
        key,
        child,
        line_rx,
    });

    Ok(())
}

pub fn invalidate_daemon() {
    bump_generation();
    dispose_daemon();
}

pub fn run_daemon_json(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
    request: serde_json::Value,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    let generation = current_generation();
    let search_path = Path::new(&search_directory);
    let cwd_path = Path::new(&cwd);
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(COMMAND_TIMEOUT.as_millis() as u64));

    ensure_daemon_ready(&settings, search_path, cwd_path)?;

    if generation != current_generation() {
        return Err("efvibe daemon session invalidated.".to_string());
    }

    let request_json =
        serde_json::to_string(&request).map_err(|error| error.to_string())?;

    let mut guard = daemon_mutex().lock().expect("daemon lock");
    let state = guard
        .as_mut()
        .ok_or_else(|| "efvibe daemon is not running.".to_string())?;

    write_request_and_wait(&mut state.child, &state.line_rx, &request_json, timeout)
}

pub fn run_expression(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
    expression: String,
    with_plan: bool,
) -> Result<String, String> {
    let request = serde_json::json!({
        "type": "eval",
        "expression": expression,
        "withPlan": with_plan,
    });

    run_daemon_json(settings, search_directory, cwd, request, None)
}
