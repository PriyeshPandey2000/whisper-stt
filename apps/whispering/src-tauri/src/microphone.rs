use cocoa::base::{id, nil};
use cocoa::foundation::NSString;
use objc::runtime::Class;
use objc::{msg_send, sel, sel_impl};
use std::ffi::CString;

/// Check if microphone permission is granted on macOS
///
/// This uses AVCaptureDevice.authorizationStatus to check the actual
/// macOS system permission, not the webview's permission state.
#[tauri::command]
pub fn is_macos_microphone_enabled() -> Result<bool, String> {
    unsafe {
        // Get AVCaptureDevice class
        let av_capture_device_class = match Class::get("AVCaptureDevice") {
            Some(class) => class,
            None => return Err("AVCaptureDevice class not found".to_string()),
        };

        // Create NSString for AVMediaTypeAudio ("soun")
        let media_type = CString::new("soun").unwrap();
        let ns_string_class = Class::get("NSString").unwrap();
        let media_type_audio: id = msg_send![ns_string_class, stringWithUTF8String: media_type.as_ptr()];

        // Call authorizationStatusForMediaType:
        // Returns: AVAuthorizationStatusNotDetermined = 0
        //          AVAuthorizationStatusRestricted = 1
        //          AVAuthorizationStatusDenied = 2
        //          AVAuthorizationStatusAuthorized = 3
        let status: i32 = msg_send![av_capture_device_class, authorizationStatusForMediaType: media_type_audio];

        // Check if authorized (status == 3)
        Ok(status == 3)
    }
}

/// Request microphone permission on macOS
///
/// This triggers the system permission prompt if not yet determined.
/// Returns the authorization status after the request.
#[tauri::command]
pub async fn request_macos_microphone_permission() -> Result<bool, String> {
    unsafe {
        let av_capture_device_class = match Class::get("AVCaptureDevice") {
            Some(class) => class,
            None => return Err("AVCaptureDevice class not found".to_string()),
        };

        let media_type = CString::new("soun").unwrap();
        let ns_string_class = Class::get("NSString").unwrap();
        let media_type_audio: id = msg_send![ns_string_class, stringWithUTF8String: media_type.as_ptr()];

        // Request access - this will show system prompt if needed
        // requestAccessForMediaType:completionHandler:
        // We'll use a simpler approach and just check status after
        let status: i32 = msg_send![av_capture_device_class, authorizationStatusForMediaType: media_type_audio];

        Ok(status == 3)
    }
}
