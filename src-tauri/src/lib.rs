use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, Position,
};

#[tauri::command]
fn show_notification(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("notification") {
        if let Ok(Some(monitor)) = window.primary_monitor() {
            let monitor_size = monitor.size();
            if let Ok(window_size) = window.outer_size() {
                let margin = 20;
                let x = monitor_size
                    .width
                    .saturating_sub(window_size.width + margin);
                let y = monitor_size
                    .height
                    .saturating_sub(window_size.height + margin + 40); // 40px extra for taskbar

                let _ = window.set_position(Position::Physical(PhysicalPosition {
                    x: x as i32,
                    y: y as i32,
                }));
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![show_notification])
        .setup(|app| {
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let aot_item =
                CheckMenuItem::with_id(app, "aot", "Always on top", true, true, None::<&str>)?;
            let open_data_item =
                MenuItem::with_id(app, "open-data", "Open data folder", true, None::<&str>)?;

            let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
            let autostart_item = CheckMenuItem::with_id(
                app,
                "autostart",
                "Start with Windows",
                true,
                autostart_enabled,
                None::<&str>,
            )?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_item,
                    &hide_item,
                    &aot_item,
                    &autostart_item,
                    &open_data_item,
                    &quit_item,
                ],
            )?;

            if let Some(window) = app.get_webview_window("main") {
                // Window is now centered via tauri.conf.json
            }

            if let Some(window) = app.get_webview_window("notification") {
                let _ = window.set_decorations(false);
                let _ = window.set_shadow(false);
                let _ = window.set_always_on_top(true);
            }

            let aot_for_handler = aot_item.clone();
            let autostart_for_handler = autostart_item.clone();
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "aot" => {
                        let checked = aot_for_handler.is_checked().unwrap_or(false);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.set_always_on_top(checked);
                        }
                    }
                    "autostart" => {
                        let checked = autostart_for_handler.is_checked().unwrap_or(false);
                        let autolaunch = app.autolaunch();
                        if checked {
                            let _ = autolaunch.enable();
                        } else {
                            let _ = autolaunch.disable();
                        }
                    }
                    "open-data" => {
                        if let Ok(data_dir) = app.path().app_data_dir() {
                            let _ = std::process::Command::new("explorer").arg(data_dir).spawn();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
