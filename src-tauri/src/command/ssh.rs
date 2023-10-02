use crate::command::base::InvokeResponse;
use rand::distributions::{Alphanumeric, DistString};
use serde::{Deserialize, Serialize};
use serde_json::json;
use ssh2::Session;
use std::collections::HashMap;
use std::fs;
use std::io::prelude::*;
use std::io::{BufRead, BufReader};
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};

lazy_static! {
    pub static ref SESSION_MAP: Arc<Mutex<HashMap<String, Session>>> =
        Arc::new(Mutex::new(HashMap::new()));
    pub static ref UPLOAD_PROGRESS: Arc<Mutex<(u64, u64)>> = Arc::new(Mutex::new((100, 0)));
    pub static ref DOWNLOAD_PROGRESS: Arc<Mutex<(u64, u64)>> = Arc::new(Mutex::new((100, 0)));
}

static mut CANCEL_SIGNAL: i32 = 10;

const AUTH_TYPE_PASSWORD: &str = &"password";

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct File {
    access: String,
    group: String,
    user: String,
    size: String,
    month: String,
    day: String,
    time: String,
    name: String,
    is_dir: bool,
}

/*
-rw-------. 1 roo roo 2897 Jun 16 15:20 anaconda-ks.cfg
drwxrwxr-x 13 501 games 4096 Jul 20 15:54 download
-rw-r--r-- 1 roo roo 1024507392 Jul 20 15:57 download. ar
-rw-r--r--. 1 roo roo 2723 Jun 16 15:19 ini .log
-rw-r--r--. 1 roo roo 16108 Jun 16 15:20 ks-pos .log
-rw-------. 1 roo roo 2832 Jun 16 15:20 original-ks.cfg
drwx------ 4 501 games 4096 Jan 29 17:17 projec -src
-rw-r--r-- 1 roo roo 48936960 Jul 7 14:53 realsee-open-admin. ar
-rw-r--r-- 1 roo roo 77155328 Jul 6 18:20 realsee-open-svc. ar
-rw-r--r-- 1 roo roo 67422720 Jul 7 15:23 realsee-shepherd-alg. ar
-rw-r--r-- 1 roo roo 67352576 Jun 27 17:59 realsee-shepherd-svc. ar
-rw-r--r-- 1 roo roo 706563 Jun 19 14:33 realsee-vr-local.2.3.0-5cf4997-nuc. ar.gz
*/
#[tauri::command]
pub async fn list_files(session_key: String, path: String) -> InvokeResponse {
    let list = SESSION_MAP.lock().unwrap();
    match list.get(&session_key) {
        Some(sess) => {
            let mut channel = sess.channel_session().unwrap();
            channel.exec(&format!("ls -l {}", path)).unwrap();
            let mut result = String::new();
            _ = channel.read_to_string(&mut result);
            let list: Vec<&str> = result.split("\n").collect();
            let mut file_list: Vec<File> = Vec::new();
            for item in list.iter() {
                let parts: Vec<&str> = item.split(" ").filter(|x| x.len() > 0).collect();
                //println!("{} - {}", parts.len(), parts.join("T").as_str());
                if parts.len() < 9 {
                    continue;
                }
                file_list.push(File {
                    access: String::from(parts[0]),
                    group: String::from(parts[2]),
                    user: String::from(parts[3]),
                    size: String::from(parts[4]),
                    month: String::from(parts[5]),
                    day: String::from(parts[6]),
                    time: String::from(parts[7]),
                    name: String::from(parts[8]),
                    is_dir: parts[0].starts_with("d"),
                })
            }
            InvokeResponse {
                success: true,
                message: "".to_string(),
                data: json!(file_list),
            }
        }
        None => InvokeResponse {
            success: false,
            message: String::from("no session"),
            data: json!(null),
        },
    }
}

#[tauri::command]
pub async fn download_remote_file(
    session_key: String,
    path: String,
    local_save_path: String,
) -> InvokeResponse {
    let list = SESSION_MAP.lock().unwrap();
    unsafe { CANCEL_SIGNAL = 0 }
    let session = list.get(&session_key);
    if let None = session {
        return InvokeResponse {
            success: false,
            message: String::from("no session"),
            data: json!(null),
        };
    }
    let sess = session.unwrap();

    let (mut remote_file, stat) = sess.scp_recv(Path::new(&path.as_str())).unwrap();
    //println!("remote file size: {}", stat.size());
    DOWNLOAD_PROGRESS.lock().unwrap().0 = stat.size();
    DOWNLOAD_PROGRESS.lock().unwrap().1 = 0;
    const BUFFER_SIZE: usize = 1024;
    let mut buffer = [0u8; BUFFER_SIZE];
    let file_path = Path::new(&local_save_path);
    if let Some(p) = file_path.parent() {
        match fs::metadata(p) {
            Ok(_) => {}
            Err(e) => {
                if let Err(err) = fs::create_dir_all(p) {
                    return InvokeResponse {
                        success: false,
                        message: format!(
                            "create dir `{}` error: {}",
                            p.to_string_lossy(),
                            err.to_string()
                        ),
                        data: json!(null),
                    };
                }
            }
        };
    }
    let tmp_file = fs::File::create(Path::new(&local_save_path.as_str()));
    //println!("{}", &local_save_path);
    loop {
        unsafe {
            if CANCEL_SIGNAL > 0 {
                return InvokeResponse {
                    success: false,
                    message: String::from("user cancelled"),
                    data: json!(null),
                };
            }
        }

        match remote_file.read(buffer.as_mut_slice()) {
            Ok(size) => {
                let mut download_progress = DOWNLOAD_PROGRESS.lock().unwrap();
                download_progress.1 = download_progress.1 + size as u64;
                tmp_file.as_ref().unwrap().write(&buffer[..size]);
                if size < BUFFER_SIZE {
                    break;
                }
            }
            Err(err) => {
                return InvokeResponse {
                    success: false,
                    message: err.to_string(),
                    data: json!(null),
                };
            }
        }
    }

    remote_file.send_eof().unwrap();
    remote_file.wait_eof().unwrap();
    remote_file.close().unwrap();
    remote_file.wait_close().unwrap();

    return InvokeResponse {
        success: true,
        message: "success".to_string(),
        data: json!(null),
    };
}

#[tauri::command]
pub async fn upload_remote_file(
    session_key: String,
    path: String,
    local_file: String,
) -> InvokeResponse {
    let list = SESSION_MAP.lock().unwrap();
    let session = list.get(&session_key);
    if let None = session {
        return InvokeResponse {
            success: false,
            message: String::from("no session"),
            data: json!(null),
        };
    }
    let sess = session.unwrap();
    let file_size = match fs::metadata(&local_file.to_string()) {
        Ok(meta) => meta.len(),
        Err(_) => 0,
    };
    if file_size < 1 {
        return InvokeResponse {
            success: false,
            message: String::from("file empty"),
            data: json!(null),
        };
    }

    let mut remote_file = sess
        .scp_send(Path::new(&path.as_str()), 0o644, file_size, None)
        .unwrap();

    let tmp_file = fs::File::open(Path::new(&local_file.as_str()));
    let mut reader = BufReader::new(tmp_file.unwrap()); // 创建 BufReader
    UPLOAD_PROGRESS.lock().unwrap().0 = file_size;
    UPLOAD_PROGRESS.lock().unwrap().1 = 0;
    let mut upload_size: u64 = 0;
    unsafe {
        CANCEL_SIGNAL = 0;
    }
    loop {
        unsafe {
            if CANCEL_SIGNAL > 0 {
                return InvokeResponse {
                    success: false,
                    message: String::from("user cancelled"),
                    data: json!(null),
                };
            }
        }
        let result = reader.fill_buf();
        if result.is_err() {
            return InvokeResponse {
                success: false,
                message: String::from(""),
                data: json!(null),
            };
        }

        let size = result.unwrap().len();
        upload_size = upload_size + size as u64;
        //println!("{}", upload_size);
        UPLOAD_PROGRESS.lock().unwrap().1 = upload_size;
        if size > 0 {
            remote_file.write(reader.buffer());
        } else {
            break;
        }
        reader.consume(size);
    }

    remote_file.send_eof().unwrap();
    remote_file.wait_eof().unwrap();
    remote_file.close().unwrap();
    remote_file.wait_close().unwrap();

    InvokeResponse {
        success: true,
        message: "success".to_string(),
        data: json!(null),
    }
}

fn connect_ssh_session(
    user: &str,
    host: &str,
    auth_type: &str,
    auth_config: &str,
) -> Result<Session, String> {
    let connection = TcpStream::connect(format!("{}:22", host));
    if let Err(err) = connection {
        return Err(err.to_string());
    }

    let mut session = Session::new().unwrap();
    session.set_tcp_stream(connection.unwrap());
    if let Err(err) = session.handshake() {
        return Err(format!("handshake error:{}", err.to_string()));
    }
    if let Err(err) = session.auth_methods(user) {
        return Err(format!("auth root error :{}", err.to_string()));
    }

    if AUTH_TYPE_PASSWORD.eq(auth_type) {
        if let Err(err) = session.userauth_password(user, auth_config) {
            return Err(format!(
                "user_auth_password error :{},{},{}",
                err.to_string(),
                user,
                auth_config
            ));
        }
    } else if let Err(err) = session.userauth_pubkey_file(user, None, Path::new(&auth_config), None)
    {
        return Err(format!("user_auth_pubkey_file error :{}", err.to_string()));
    }

    if !session.authenticated() {
        return Err(String::from("authenticated wrong"));
    }

    Ok(session)
}

#[tauri::command]
pub async fn test_server_connect(
    user: String,
    host: String,
    auth_type: String,
    auth_config: String,
) -> InvokeResponse {
    let session = connect_ssh_session(&user, &host, &auth_type, &auth_config);
    if let Err(err) = session {
        return InvokeResponse {
            success: false,
            message: err.to_string(),
            data: json!(null),
        };
    }
    return InvokeResponse {
        success: true,
        message: "ok".to_string(),
        data: json!(null),
    };
}

#[tauri::command]
pub async fn connect_server(
    user: String,
    host: String,
    auth_type: String,
    auth_config: String,
) -> InvokeResponse {
    let session = connect_ssh_session(&user, &host, &auth_type, &auth_config);
    if let Err(err) = session {
        return InvokeResponse {
            success: false,
            message: err.to_string(),
            data: json!(null),
        };
    }
    let session_key = Alphanumeric.sample_string(&mut rand::thread_rng(), 16);
    SESSION_MAP
        .lock()
        .unwrap()
        .insert(session_key.clone(), session.unwrap());
    return InvokeResponse {
        success: true,
        message: "ok".to_string(),
        data: json!({ "session_key": session_key }),
    };
}

#[tauri::command]
pub async fn exec_command(session_key: String, cmd_string: String) -> InvokeResponse {
    let list = SESSION_MAP.lock().unwrap();
    match list.get(&session_key) {
        Some(sess) => {
            let mut channel = sess.channel_session().unwrap();
            channel.exec(&cmd_string).unwrap();
            let mut result = String::new();
            _ = channel.read_to_string(&mut result);
            let list: Vec<&str> = result.split("\n").collect();
            InvokeResponse {
                success: true,
                message: "".to_string(),
                data: json!(list),
            }
        }
        None => InvokeResponse {
            success: false,
            message: String::from("no session"),
            data: json!(null),
        },
    }
}

#[tauri::command]
pub async fn get_download_progress() -> InvokeResponse {
    let progress = DOWNLOAD_PROGRESS.lock().unwrap();
    InvokeResponse {
        success: true,
        message: String::from("ok"),
        data: json!({
            "total_size" : progress.0,
            "download_size" : progress.1
        }),
    }
}

#[tauri::command]
pub async fn get_upload_progress() -> InvokeResponse {
    let progress = UPLOAD_PROGRESS.lock().unwrap();
    InvokeResponse {
        success: true,
        message: String::from("ok"),
        data: json!({
            "total_size" : progress.0,
            "upload_size" : progress.1
        }),
    }
}

#[tauri::command]
pub async fn send_cancel_signal() -> InvokeResponse {
    unsafe { CANCEL_SIGNAL = 1 }
    InvokeResponse {
        success: true,
        message: String::from("ok"),
        data: json!(null),
    }
}
