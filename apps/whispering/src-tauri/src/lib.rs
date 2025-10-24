// Platform-specific modules
#[cfg(target_os = "macos")]
mod accessibility;

// Re-export platform-specific functions
#[cfg(target_os = "macos")]
use accessibility::{is_macos_accessibility_enabled, open_apple_accessibility};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};
use tauri_plugin_aptabase::EventTracker;

#[cfg(target_os = "macos")]
use cocoa::appkit::NSColor;
#[cfg(target_os = "macos")]
use cocoa::base::nil;
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

pub mod recorder;
use recorder::commands::{
    cancel_recording, close_recording_session, enumerate_recording_devices,
    get_current_recording_id, hide_recording_overlay, init_recording_session, 
    show_recording_overlay, start_recording, stop_recording, AppData,
};

#[cfg(target_os = "macos")]
fn make_window_truly_transparent(window: &tauri::WebviewWindow) {
    unsafe {
        // Get the raw NSWindow handle
        let ns_window = window.ns_window().unwrap() as *mut objc::runtime::Object;
        
        // 1) Make window non-opaque and set clear background
        let _: () = msg_send![ns_window, setOpaque: 0u8]; // NO
        let clear_color = NSColor::clearColor(nil);
        let _: () = msg_send![ns_window, setBackgroundColor: clear_color];

        // 2) Set contentView layer to have corner radius and maskToBounds = YES
        let content_view: *mut objc::runtime::Object = msg_send![ns_window, contentView];
        let _: () = msg_send![content_view, setWantsLayer: 1u8]; // YES

        // Get layer and set corner radius & masksToBounds
        let layer: *mut objc::runtime::Object = msg_send![content_view, layer];
        let radius: f64 = 18.0; // Match your pill radius
        let _: () = msg_send![layer, setCornerRadius: radius];
        let _: () = msg_send![layer, setMasksToBounds: 1u8];

        // 3) Walk subviews to find WKWebView and disable its background drawing
        let subviews: *mut objc::runtime::Object = msg_send![content_view, subviews];
        let count: usize = msg_send![subviews, count];
        for i in 0..count {
            let sub: *mut objc::runtime::Object = msg_send![subviews, objectAtIndex: i];
            if sub.is_null() { continue; }

            // Check class name (Objective-C)
            let cls_name: *const i8 = msg_send![sub, className];
            if !cls_name.is_null() {
                let cname = std::ffi::CStr::from_ptr(cls_name).to_string_lossy();
                if cname.contains("WKWebView") {
                    // webview.setValue(false, forKey: "drawsBackground");
                    let key = std::ffi::CString::new("drawsBackground").unwrap();
                    let val: u8 = 0; // NO
                    let _: () = msg_send![sub, setValue: val forKey: key.as_ptr()];
                    // Also ensure the webview is non-opaque
                    let _: () = msg_send![sub, setOpaque: 0u8];
                    let _: () = msg_send![sub, setWantsLayer: 1u8];
                    break;
                }
            }
        }
    }
}

/// Create the system tray with menu items
fn create_system_tray(app: &tauri::App) -> Result<(), String> {
    // Create menu items
    let show_hide_item = MenuItem::with_id(app, "show_hide", "Show/Hide NoteFlux", true, None::<&str>)
        .map_err(|e| format!("Failed to create show/hide menu item: {}", e))?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
        .map_err(|e| format!("Failed to create quit menu item: {}", e))?;
    
    // Create menu
    let menu = Menu::with_items(app, &[&show_hide_item, &quit_item])
        .map_err(|e| format!("Failed to create menu: {}", e))?;
    
    // Create tray icon (using existing icon from bundle)
    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false) // Don't show menu on left click
        .build(app)
        .map_err(|e| format!("Failed to create tray icon: {}", e))?;
        
    Ok(())
}

/// Create the recording overlay at app startup (hidden) to prevent focus stealing later
fn create_recording_overlay_at_startup(app: &tauri::App) -> Result<(), String> {
    
    let webview_url = if cfg!(dev) {
        // For development, try to find the file relative to the executable
        let exe_dir = std::env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?
            .parent()
            .ok_or("Failed to get executable directory")?
            .to_path_buf();
        let dev_path = exe_dir
            .parent()
            .unwrap_or(&exe_dir)
            .parent()
            .unwrap_or(&exe_dir)
            .parent()
            .unwrap_or(&exe_dir)
            .join("src-tauri/recording-overlay.html");
        WebviewUrl::External(
            format!("file://{}", dev_path.display())
                .parse()
                .map_err(|e| format!("Failed to parse URL: {}", e))?
        )
    } else {
        // For production, find the bundled resource file
        let app_dir = app.path().resource_dir()
            .map_err(|e| format!("Failed to get resource directory: {}", e))?;
        let overlay_path = app_dir.join("recording-overlay.html");
        
        if overlay_path.exists() {
            WebviewUrl::External(
                format!("file://{}", overlay_path.display())
                    .parse()
                    .map_err(|e| format!("Failed to parse URL: {}", e))?
            )
        } else {
            return Err(format!("Recording overlay file not found at: {}", overlay_path.display()));
        }
    };

    let overlay_window = WebviewWindowBuilder::new(
        app,
        "recording-overlay",
        webview_url,
    )
    .title("Recording")
    .inner_size(94.0, 30.0)    // Exactly the size of content including rounded corners
    .position(660.0, 800.0)    // Bottom center, shifted down
    .decorations(false)        // No window decorations
    .resizable(false)          // Not resizable
    .skip_taskbar(true)        // Don't show in taskbar
    .visible_on_all_workspaces(true)
    .shadow(false)             // No shadow
    .focused(false)            // Don't steal focus
    .visible(false)            // Start hidden!
    .transparent(true)         // Enable transparency with private API
    .content_protected(false)  // Allow screenshots
    .theme(None)               // No theme to avoid default background
    .build()
    .map_err(|e| format!("Failed to create overlay window: {}", e))?;

    // Temporarily disable click-through for debugging
    // overlay_window
    //     .set_ignore_cursor_events(true)
    //     .map_err(|e| format!("Failed to set ignore cursor events: {}", e))?;
    
    overlay_window
        .set_always_on_top(true)
        .map_err(|e| format!("Failed to set always on top: {}", e))?;

    // Apply comprehensive transparency fix for macOS
    #[cfg(target_os = "macos")]
    {
        make_window_truly_transparent(&overlay_window);
    }

    Ok(())
}

// Removed native overlay imports

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    // Load .env file if it exists
    dotenvy::dotenv().ok();
    
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_aptabase::Builder::new(
            &std::env::var("APTABASE_KEY").unwrap_or_default()
        ).build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(AppData::new());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Only show and focus the main window if it's not already visible
            // This prevents focus stealing during recording sessions
            if let Some(main_window) = app.get_webview_window("main") {
                if let Ok(is_visible) = main_window.is_visible() {
                    if !is_visible {
                        let _ = main_window.show();
                        let _ = main_window.set_focus();
                    }
                }
            }
        }));
    }

    // Platform-specific command handlers
    #[cfg(target_os = "macos")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        write_text,
        paste,
        open_apple_accessibility,
        is_macos_accessibility_enabled,
        // Audio recorder commands
        get_current_recording_id,
        enumerate_recording_devices,
        init_recording_session,
        close_recording_session,
        start_recording,
        stop_recording,
        cancel_recording,
        // UI commands
        show_recording_overlay,
        hide_recording_overlay,
    ]);

    #[cfg(not(target_os = "macos"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        write_text,
        paste,
        // Audio recorder commands
        get_current_recording_id,
        enumerate_recording_devices,
        init_recording_session,
        close_recording_session,
        start_recording,
        stop_recording,
        cancel_recording,
        // UI commands
        show_recording_overlay,
        hide_recording_overlay,
    ]);

    let mut app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Set activation policy to Accessory to hide from dock and run as menu bar app on macOS
    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    // CRITICAL: Create recording overlay at startup (hidden) so we don't create it during recording
    // This prevents focus stealing when recording starts
    let _ = create_recording_overlay_at_startup(&app);
    
    // Create system tray
    let _ = create_system_tray(&app);

    // Show main window on startup
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }

    
    app.run(|handler, event| match event {
        tauri::RunEvent::Exit { .. } => {
            let _ = handler.track_event("app_exited", None);
            handler.flush_events_blocking();
        }
        // Handle dock icon clicks on macOS (and similar for other platforms)
        tauri::RunEvent::Reopen { .. } => {
            if let Some(main_window) = handler.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }
        }
        tauri::RunEvent::Ready { .. } => {
            let _ = handler.track_event("app_started", None);
        }
        // Handle tray icon events  
        tauri::RunEvent::TrayIconEvent(tray_event) => {
            match tray_event {
                TrayIconEvent::Click { button, button_state, .. } => {
                    // Left click to toggle window visibility
                    if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Up {
                        if let Some(main_window) = handler.get_webview_window("main") {
                            match main_window.is_visible() {
                                Ok(true) => {
                                    let _ = main_window.hide();
                                }
                                Ok(false) => {
                                    let _ = main_window.show();
                                    let _ = main_window.set_focus();
                                }
                                Err(_) => {}
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        // Handle menu events separately in Tauri 2.0
        tauri::RunEvent::MenuEvent(menu_event) => {
            match menu_event.id().as_ref() {
                "show_hide" => {
                    if let Some(main_window) = handler.get_webview_window("main") {
                        match main_window.is_visible() {
                            Ok(true) => {
                                let _ = main_window.hide();
                            }
                            Ok(false) => {
                                let _ = main_window.show();
                                let _ = main_window.set_focus();
                            }
                            Err(_) => {}
                        }
                    }
                }
                "quit" => {
                    handler.exit(0);
                }
                _ => {}
            }
        }
        _ => {}
    });
}

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

/// Types text character-by-character at the cursor position using Enigo.
///
/// This simulates keyboard input by typing each character sequentially, which works
/// across all applications but is slower than pasting. Best used as a fallback when
/// paste operations fail or for applications that don't support paste.
///
/// **Note**: This method may have issues with non-ASCII characters in some applications
/// and can appear slow for large text blocks.
#[tauri::command]
fn write_text(text: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    // Hide our main window if it's visible to avoid interfering with focus
    if let Some(main_window) = app_handle.get_webview_window("main") {
        if let Ok(is_visible) = main_window.is_visible() {
            if is_visible {
                let _ = main_window.hide();
            }
        }
    }
    
    // Try to create Enigo instance with retry for permission issues
    let mut enigo = None;
    let mut last_error = String::new();
    
    for attempt in 1..=2 {
        match Enigo::new(&Settings::default()) {
            Ok(e) => {
                enigo = Some(e);
                break;
            },
            Err(e) => {
                last_error = format!("Failed to create Enigo instance: {}", e);
                
                if last_error.contains("permission") && attempt == 1 {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            }
        }
    }
    
    let mut enigo = enigo.ok_or(last_error)?;
    
    // Add a small delay before typing to ensure the target app has time to receive focus
    std::thread::sleep(std::time::Duration::from_millis(50));
    
    enigo.text(&text).map_err(|e| format!("Failed to type text: {}", e))?;
    
    Ok(())
}

/// Simulates a paste operation (Cmd+V on macOS, Ctrl+V elsewhere).
///
/// **Important**: This assumes text is already in the system clipboard. Call your
/// clipboard service to copy text before using this function.
///
/// **Known Issue**: Uses `Key::Unicode('v')` which assumes QWERTY keyboard layout.
/// This may fail on alternative layouts like Dvorak or Colemak.
#[tauri::command]
fn paste() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| {
        format!("Failed to create Enigo instance for paste: {}", e)
    })?;

    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    enigo
        .key(modifier, Direction::Press)
        .map_err(|e| format!("Failed to press modifier key: {}", e))?;
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| format!("Failed to click 'v' key: {}", e))?;
    enigo
        .key(modifier, Direction::Release)
        .map_err(|e| format!("Failed to release modifier key: {}", e))?;

    Ok(())
}
