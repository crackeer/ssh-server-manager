#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
mod command;
mod util;
#[macro_use]
extern crate lazy_static;
use command::ssh::{
     list_files, download_remote_file, upload_remote_file, test_server_connect, connect_server, exec_command, get_download_progress, get_upload_progress, send_cancel_signal
};

use command::file::create_dir;

use tauri::{Menu, MenuItem, Submenu};
use tauri::{Window, WindowMenuEvent};

fn main() {
    let native_menu = Submenu::new(
        "System",
        Menu::new()
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::SelectAll),
    );
    let menu = Menu::new().add_submenu(native_menu);
    let ctx = tauri::generate_context!();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_files,
            download_remote_file,
            upload_remote_file,
            test_server_connect,
            connect_server, 
            exec_command,
            get_download_progress,
            get_upload_progress,
            send_cancel_signal,
            create_dir
        ])
        .menu(menu)
        .on_menu_event(window_menu_event)
        .run(ctx)
        .expect("error while running tauri application");
}

#[tauri::command]
fn set_window_title(window: Window, title: String) -> String {
    _ = window.set_title(title.as_str());
    String::from("ok")
}

fn window_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "quit" => {
            std::process::exit(0);
        }
        "close" => {
            event.window().close().unwrap();
        }
        &_ => todo!(),
    }
}
