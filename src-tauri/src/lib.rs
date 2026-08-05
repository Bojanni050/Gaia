/**
 * Gaia — desktop shell entry point.
 *
 * The shell is intentionally thin. It opens a window, restores its previous
 * state, and loads the existing React frontend. All of Gaia's identity,
 * reasoning, and presence live in the frontend — the shell knows nothing
 * about them.
 */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running Gaia");
}
