//! Settings — the desktop's persisted local configuration.
//!
//! Settings describe *this device's* behaviour only (which server to talk
//! to, notification and audio preferences, enabled capture sources). They
//! never encode anything cognitive; Gaia's long-term state lives server-side.

mod store;

use std::sync::RwLock;

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::communication::ServerConfig;

pub use store::SettingsError;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub server: ServerConfig,
    pub notifications: NotificationSettings,
    pub audio: AudioSettings,
    pub capture: CaptureSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NotificationSettings {
    pub enabled: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self { enabled: true }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AudioSettings {
    /// Preferred input device id, if the user chose one.
    pub preferred_input: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CaptureSettings {
    /// Ids of capture sources the user has enabled.
    pub enabled_sources: Vec<String>,
}

/// Managed settings state: persisted copy plus in-memory current value.
pub struct SettingsState {
    current: RwLock<Settings>,
    store: store::FileSettingsStore,
}

impl SettingsState {
    /// Opens (and loads) the settings state from the given config directory.
    /// Falls back to defaults when no settings file exists yet.
    pub fn open(config_dir: Option<std::path::PathBuf>) -> Self {
        let store = store::FileSettingsStore::open(config_dir);
        let current = store.load().unwrap_or_default();
        Self {
            current: RwLock::new(current),
            store,
        }
    }

    pub fn get(&self) -> Settings {
        self.current.read().expect("settings lock poisoned").clone()
    }

    fn replace(&self, settings: Settings) {
        *self.current.write().expect("settings lock poisoned") = settings;
    }
}

#[tauri::command]
pub fn settings_get(settings: tauri::State<'_, SettingsState>) -> Settings {
    settings.get()
}

#[tauri::command]
pub async fn settings_save(
    app: tauri::AppHandle,
    settings: tauri::State<'_, SettingsState>,
    new_settings: Settings,
) -> Result<Settings, crate::error::DesktopError> {
    settings
        .store
        .save(&new_settings)
        .map_err(crate::error::DesktopError::Settings)?;
    settings.replace(new_settings.clone());

    // Keep the server link in step with the new configuration.
    if let Some(link) = app.try_state::<crate::communication::ServerLink>() {
        link.reconfigure(new_settings.server.clone())
            .map_err(crate::error::DesktopError::Communication)?;
    }
    Ok(new_settings)
}
