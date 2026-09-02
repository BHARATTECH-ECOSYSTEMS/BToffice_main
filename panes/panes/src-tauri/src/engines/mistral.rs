use std::{
    collections::HashMap,
    fs,
    path::{Component, Path, PathBuf},
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::engines::events::TurnCompletionStatus;
use crate::engines::{
    ActionResult, ActionType, Engine, EngineEvent, EngineThread, ModelInfo, ReasoningEffortOption,
    SandboxPolicy, ThreadScope, TurnInput,
};

pub struct MistralEngine {
    thread_roots: Arc<Mutex<HashMap<String, PathBuf>>>,
}

impl Default for MistralEngine {
    fn default() -> Self {
        Self {
            thread_roots: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

async fn finish_turn(event_tx: &mpsc::Sender<EngineEvent>, status: TurnCompletionStatus) {
    let _ = event_tx
        .send(EngineEvent::TurnCompleted {
            token_usage: None,
            status,
        })
        .await;
}

async fn fail_turn(event_tx: &mpsc::Sender<EngineEvent>, message: impl Into<String>) {
    let _ = event_tx
        .send(EngineEvent::Error {
            message: message.into(),
            recoverable: false,
        })
        .await;
    finish_turn(event_tx, TurnCompletionStatus::Failed).await;
}

fn read_env_value(key: &str) -> Option<String> {
    if let Ok(value) = std::env::var(key) {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    let current_dir = std::env::current_dir().ok()?;
    let mut candidates = Vec::<PathBuf>::new();
    for dir in current_dir.ancestors() {
        candidates.push(dir.join(".env"));
        candidates.push(dir.join("backend").join(".env"));
        candidates.push(dir.join("src-tauri").join("backend").join(".env"));
    }

    for path in candidates {
        let Ok(contents) = fs::read_to_string(path) else {
            continue;
        };
        for line in contents.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((name, value)) = line.split_once('=') else {
                continue;
            };
            if name.trim() != key {
                continue;
            }
            let value = value.trim().trim_matches('"').trim_matches('\'');
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }

    None
}

fn extract_action_array(reply: &str) -> Option<Vec<serde_json::Value>> {
    let parse_actions = |text: &str| {
        serde_json::from_str::<serde_json::Value>(text)
            .ok()
            .and_then(|value| value.get("actions").and_then(|actions| actions.as_array()).cloned())
    };

    if let Some(actions) = parse_actions(reply) {
        return Some(actions);
    }

    let start = reply.find('{')?;
    let end = reply.rfind('}')?;
    if end <= start {
        return None;
    }

    parse_actions(&reply[start..=end])
}

struct StructuredMistralReply {
    actions: Vec<serde_json::Value>,
    explanation: Option<String>,
}

fn extract_json_object(reply: &str) -> Option<serde_json::Value> {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(reply) {
        return Some(value);
    }

    let start = reply.find('{')?;
    let end = reply.rfind('}')?;
    if end <= start {
        return None;
    }

    serde_json::from_str::<serde_json::Value>(&reply[start..=end]).ok()
}

fn collect_string_list(value: Option<&serde_json::Value>) -> Vec<String> {
    match value {
        Some(serde_json::Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![trimmed.to_string()]
            }
        }
        Some(serde_json::Value::Array(items)) => items
            .iter()
            .filter_map(|item| item.as_str())
            .map(str::trim)
            .filter(|item| !item.is_empty())
            .map(str::to_string)
            .collect(),
        _ => Vec::new(),
    }
}

fn compose_explanation_text(
    summary: Option<&str>,
    completed: &[String],
    next_steps: &[String],
) -> Option<String> {
    let mut sections = Vec::new();

    if let Some(summary) = summary.map(str::trim).filter(|text| !text.is_empty()) {
        sections.push(summary.to_string());
    }

    if !completed.is_empty() {
        sections.push(format!("What I completed:\n- {}", completed.join("\n- ")));
    }

    if !next_steps.is_empty() {
        sections.push(format!("What to do next:\n- {}", next_steps.join("\n- ")));
    }

    if sections.is_empty() {
        None
    } else {
        Some(sections.join("\n\n"))
    }
}

fn summarize_generated_actions(actions: &[serde_json::Value]) -> String {
    let mut backend_paths = Vec::new();
    let mut frontend_paths = Vec::new();
    let mut other_paths = Vec::new();

    for action in actions {
        let Some(path) = action.get("path").and_then(|value| value.as_str()) else {
            continue;
        };
        if path.starts_with("backend/") {
            backend_paths.push(path.to_string());
        } else if path.starts_with("frontend/") {
            frontend_paths.push(path.to_string());
        } else {
            other_paths.push(path.to_string());
        }
    }

    let mut completed = Vec::new();
    if !backend_paths.is_empty() {
        completed.push(format!(
            "Created the backend scaffold with {} file{} under `backend/`.",
            backend_paths.len(),
            if backend_paths.len() == 1 { "" } else { "s" }
        ));
    }
    if !frontend_paths.is_empty() {
        completed.push(format!(
            "Created the frontend scaffold with {} file{} under `frontend/`.",
            frontend_paths.len(),
            if frontend_paths.len() == 1 { "" } else { "s" }
        ));
    }
    if !other_paths.is_empty() {
        completed.push(format!(
            "Added {} supporting file{} in the project root.",
            other_paths.len(),
            if other_paths.len() == 1 { "" } else { "s" }
        ));
    }

    let next_steps = vec![
        "Install dependencies in each generated app folder, such as `backend` and `frontend`.".to_string(),
        "Review the environment variables and update any placeholder secrets or database URLs before running the app.".to_string(),
        "Start the generated services locally and test the main user flow to confirm the scaffold matches your request.".to_string(),
    ];

    compose_explanation_text(
        Some("I created the requested project scaffold in the selected folder."),
        &completed,
        &next_steps,
    )
    .unwrap_or_else(|| "I created the requested project files in the selected folder.".to_string())
}

fn extract_structured_reply(reply: &str) -> Option<StructuredMistralReply> {
    let value = extract_json_object(reply)?;
    let actions = value.get("actions")?.as_array()?.clone();

    let summary = value
        .get("summary")
        .and_then(|value| value.as_str())
        .or_else(|| value.get("assistant_response").and_then(|value| value.as_str()))
        .or_else(|| value.get("message").and_then(|value| value.as_str()))
        .or_else(|| value.get("explanation").and_then(|value| value.as_str()));
    let completed = collect_string_list(value.get("completed"));
    let next_steps = collect_string_list(value.get("next_steps"));

    Some(StructuredMistralReply {
        actions,
        explanation: compose_explanation_text(summary, &completed, &next_steps),
    })
}

fn root_from_scope(scope: &ThreadScope) -> PathBuf {
    match scope {
        ThreadScope::Repo { repo_path } => PathBuf::from(repo_path),
        ThreadScope::Workspace { root_path, .. } => PathBuf::from(root_path),
    }
}

fn resolve_generated_file_path(root: &Path, relative_path: &str) -> anyhow::Result<PathBuf> {
    let relative_path = relative_path.trim().replace('\\', "/");
    if relative_path.is_empty() {
        anyhow::bail!("file path is empty");
    }

    let path = Path::new(&relative_path);
    if path.is_absolute() {
        anyhow::bail!("absolute file paths are not allowed: {relative_path}");
    }

    let mut safe_path = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => safe_path.push(part),
            Component::CurDir => {}
            Component::ParentDir => {
                anyhow::bail!("file path cannot leave the project folder: {relative_path}");
            }
            Component::RootDir | Component::Prefix(_) => {
                anyhow::bail!("absolute file paths are not allowed: {relative_path}");
            }
        }
    }

    if safe_path.as_os_str().is_empty() {
        anyhow::bail!("file path is empty");
    }

    Ok(root.join(safe_path))
}

#[async_trait]
impl Engine for MistralEngine {
    fn id(&self) -> &str {
        "mistral"
    }

    fn name(&self) -> &str {
        "Mistral"
    }

    fn models(&self) -> Vec<ModelInfo> {
        vec![ModelInfo {
            id: "mistral-large".to_string(),
            display_name: "Mistral Large".to_string(),
            description: "Mistral-only chat model".to_string(),
            hidden: false,
            is_default: true,
            upgrade: None,
            availability_nux: None,
            upgrade_info: None,
            input_modalities: vec!["text".to_string()],
            supports_personality: true,
            default_reasoning_effort: "medium".to_string(),
            supported_reasoning_efforts: vec![
                ReasoningEffortOption {
                    reasoning_effort: "low".to_string(),
                    description: "Fast".to_string(),
                },
                ReasoningEffortOption {
                    reasoning_effort: "medium".to_string(),
                    description: "Balanced".to_string(),
                },
                ReasoningEffortOption {
                    reasoning_effort: "high".to_string(),
                    description: "Best quality".to_string(),
                },
            ],
        }]
    }

    async fn is_available(&self) -> bool {
        read_env_value("MISTRAL_API_KEY").is_some()
    }

    async fn start_thread(
        &self,
        scope: ThreadScope,
        resume: Option<&str>,
        _model: &str,
        _sandbox: SandboxPolicy,
    ) -> Result<EngineThread, anyhow::Error> {
        let root = root_from_scope(&scope);
        fs::create_dir_all(&root)?;
        let engine_thread_id = resume
            .map(str::to_string)
            .unwrap_or_else(|| format!("mistral-{}", uuid::Uuid::new_v4()));

        self.thread_roots
            .lock()
            .map_err(|_| anyhow::anyhow!("mistral thread root lock poisoned"))?
            .insert(engine_thread_id.clone(), root);

        Ok(EngineThread {
            engine_thread_id,
        })
    }

    async fn send_message(
        &self,
        engine_thread_id: &str,
        input: TurnInput,
        event_tx: mpsc::Sender<EngineEvent>,
        _cancellation: CancellationToken,
    ) -> Result<(), anyhow::Error> {
        let project_root = self
            .thread_roots
            .lock()
            .map_err(|_| anyhow::anyhow!("mistral thread root lock poisoned"))?
            .get(engine_thread_id)
            .cloned()
            .unwrap_or(std::env::current_dir()?);

        let api_key = match read_env_value("MISTRAL_API_KEY") {
            Some(key) => key,
            None => {
                fail_turn(&event_tx, "MISTRAL_API_KEY is not set").await;
                return Ok(());
            }
        };

        let system_prompt = r#"
You are a coding agent inside a desktop IDE.

For requests to build an app or create files, prefer returning JSON in this shape:
{
  "summary": "2-4 sentence explanation of what was created and the architecture choices",
  "completed": [
    "Short bullet describing what was done"
  ],
  "next_steps": [
    "Concrete next step the user should do next"
  ],
  "actions": [
    {
      "type": "create_file",
      "path": "backend/models/User.js",
      "content": "file content"
    }
  ]
}

Use sensible folders such as backend/, frontend/src/pages/, and frontend/src/components/.
All paths must be relative paths. Do not use absolute paths or ../ segments.
When you return actions, always include `summary` and `next_steps` so the user gets a natural explanation in chat.
If the user asks a normal question or you cannot safely produce file actions, answer in plain text.
"#;

        let response = match Client::new()
            .post("https://api.mistral.ai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": "mistral-large-latest",
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": input.message }
                ]
            }))
            .send()
            .await
        {
            Ok(response) => response,
            Err(error) => {
                fail_turn(&event_tx, format!("Mistral request failed: {error}")).await;
                return Ok(());
            }
        };

        let status = response.status();
        let body = match response.text().await {
            Ok(body) => body,
            Err(error) => {
                fail_turn(
                    &event_tx,
                    format!("Failed to read Mistral response body: {error}"),
                )
                .await;
                return Ok(());
            }
        };

        if !status.is_success() {
            fail_turn(&event_tx, format!("Mistral API error ({status}): {body}")).await;
            return Ok(());
        }

        let response_json: serde_json::Value = match serde_json::from_str(&body) {
            Ok(value) => value,
            Err(error) => {
                fail_turn(&event_tx, format!("Invalid Mistral response JSON: {error}")).await;
                return Ok(());
            }
        };

        let reply = response_json
            .get("choices")
            .and_then(|choices| choices.get(0))
            .and_then(|choice| choice.get("message"))
            .and_then(|message| message.get("content"))
            .and_then(|content| content.as_str())
            .unwrap_or("No response from Mistral")
            .replace("```json", "")
            .replace("```", "")
            .trim()
            .to_string();

        let structured_reply = extract_structured_reply(&reply);
        let Some(actions) = structured_reply
            .as_ref()
            .map(|reply| reply.actions.clone())
            .or_else(|| extract_action_array(&reply))
        else {
            let _ = event_tx
                .send(EngineEvent::TextDelta { content: reply })
                .await;
            finish_turn(&event_tx, TurnCompletionStatus::Completed).await;
            return Ok(());
        };

        let explanation = structured_reply
            .and_then(|reply| reply.explanation)
            .unwrap_or_else(|| summarize_generated_actions(&actions));

        let _ = event_tx
            .send(EngineEvent::TextDelta {
                content: explanation,
            })
            .await;

        let mut created_count = 0usize;
        for action in actions {
            let path = action.get("path").and_then(|path| path.as_str()).unwrap_or("");
            let content = action
                .get("content")
                .and_then(|content| content.as_str())
                .unwrap_or("");
            if path.trim().is_empty() {
                continue;
            }

            let _ = event_tx
                .send(EngineEvent::ActionStarted {
                    action_id: path.to_string(),
                    engine_action_id: None,
                    action_type: ActionType::FileWrite,
                    summary: format!("Creating {path}"),
                    details: json!({}),
                })
                .await;

            let write_result = resolve_generated_file_path(&project_root, path)
                .and_then(|file_path| {
                    if let Some(parent) = file_path.parent() {
                        fs::create_dir_all(parent)?;
                    }
                    fs::write(&file_path, content)?;
                    Ok(file_path)
                });
            if write_result.is_ok() {
                created_count += 1;
            }

            let error = write_result.as_ref().err().map(|error| error.to_string());
            let _ = event_tx
                .send(EngineEvent::ActionCompleted {
                    action_id: path.to_string(),
                    result: ActionResult {
                        success: error.is_none(),
                        output: None,
                        error,
                        diff: None,
                        duration_ms: 0,
                    },
                })
                .await;
        }

        let _ = event_tx
            .send(EngineEvent::TextDelta {
                content: format!(
                    "\n\nSaved {created_count} project file{} in the selected folder.",
                    if created_count == 1 { "" } else { "s" }
                ),
            })
            .await;
        finish_turn(&event_tx, TurnCompletionStatus::Completed).await;

        Ok(())
    }

    async fn steer_message(
        &self,
        _engine_thread_id: &str,
        _input: TurnInput,
    ) -> Result<(), anyhow::Error> {
        Ok(())
    }

    async fn respond_to_approval(
        &self,
        _approval_id: &str,
        _response: serde_json::Value,
        _route: Option<crate::engines::ApprovalRequestRoute>,
    ) -> Result<(), anyhow::Error> {
        Ok(())
    }

    async fn interrupt(&self, _engine_thread_id: &str) -> Result<(), anyhow::Error> {
        Ok(())
    }

    async fn archive_thread(&self, _engine_thread_id: &str) -> Result<(), anyhow::Error> {
        Ok(())
    }

    async fn unarchive_thread(&self, _engine_thread_id: &str) -> Result<(), anyhow::Error> {
        Ok(())
    }
}

impl MistralEngine {
    pub async fn prewarm(&self) -> anyhow::Result<()> {
        Ok(())
    }

    pub async fn read_thread_preview(&self, _id: &str) -> Option<String> {
        None
    }

    pub async fn set_thread_name(&self, _id: &str, _name: &str) -> anyhow::Result<()> {
        Ok(())
    }

    pub async fn read_thread_sync_snapshot(
        &self,
        _id: &str,
    ) -> anyhow::Result<crate::engines::ThreadSyncSnapshot> {
        Ok(crate::engines::ThreadSyncSnapshot {
            title: None,
            preview: None,
            raw_status: None,
            active_flags: vec![],
        })
    }
}
