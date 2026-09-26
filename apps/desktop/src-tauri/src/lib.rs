use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct ChildProcesses {
    children: Vec<Child>,
}

impl Drop for ChildProcesses {
    fn drop(&mut self) {
        for child in &mut self.children {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn find_project_root() -> Option<PathBuf> {
    // During dev: CARGO_MANIFEST_DIR points to src-tauri, go up 2 levels
    if let Some(manifest) = option_env!("CARGO_MANIFEST_DIR") {
        let root = PathBuf::from(manifest)
            .parent()? // apps/desktop
            .parent()? // apps
            .parent()? // project root
            .to_path_buf();
        if root.join("apps").join("api").exists() {
            return Some(root);
        }
    }
    // Fallback: walk up from cwd
    let mut dir = std::env::current_dir().ok()?;
    for _ in 0..5 {
        if dir.join("apps").join("api").exists() {
            return Some(dir);
        }
        dir = dir.parent()?.to_path_buf();
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(ChildProcesses { children: vec![] }))
        .setup(|app| {
            let mut children: Vec<Child> = Vec::new();

            // Spawn ollama serve (may already be running, that's fine)
            if let Ok(child) = Command::new("ollama").args(["serve"]).spawn() {
                children.push(child);
            }

            // Spawn the NestJS API
            if let Some(root) = find_project_root() {
                let api_dir = root.join("apps").join("api");
                #[cfg(target_os = "windows")]
                let npm = "npm.cmd";
                #[cfg(not(target_os = "windows"))]
                let npm = "npm";

                if let Ok(child) = Command::new(npm)
                    .args(["run", "dev"])
                    .current_dir(&api_dir)
                    .spawn()
                {
                    children.push(child);
                }
            }

            let state = app.state::<Mutex<ChildProcesses>>();
            let mut procs = state.lock().unwrap();
            procs.children = children;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<Mutex<ChildProcesses>>();
                let mut procs = state.lock().unwrap();
                for child in &mut procs.children {
                    let _ = child.kill();
                    let _ = child.wait();
                }
                procs.children.clear();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
