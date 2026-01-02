use tauri::AppHandle;

pub struct LinuxFnShortcutManager;

impl LinuxFnShortcutManager {
    pub fn new(_app: AppHandle) -> Result<Self, String> {
        Err("Fn key shortcuts are not supported on Linux".to_string())
    }

    pub fn register(&self, _shortcut: &str, _command_id: &str) -> Result<(), String> {
        Err("Fn key shortcuts are not supported on Linux".to_string())
    }

    pub fn unregister(&self, _shortcut: &str) -> Result<(), String> {
        Err("Fn key shortcuts are not supported on Linux".to_string())
    }

    pub fn enable_recording_mode(&self) -> Result<(), String> {
        Err("Fn key shortcuts are not supported on Linux".to_string())
    }

    pub fn disable_recording_mode(&self) -> Result<(), String> {
        Err("Fn key shortcuts are not supported on Linux".to_string())
    }
}
