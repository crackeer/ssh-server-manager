import { invoke } from '@tauri-apps/api/tauri'


var writeFile = async (file, content) => {
    let Result = await invoke('write_file', {
        name: file, content: content,
    })
    return Result
}

var readFile = async (file, content) => {
    let Result = await invoke('get_file_content', {
        name: file, content: content,
    })
    return Result
}


var readDir = async (dir, ext) => {
    let list = await invoke('get_file_list', {
        dir, ext
    })
    return list
}

var simpleReadDir = async (dir, ext) => {
    let list = await invoke('simple_read_dir', {
        dir, ext
    })
    return list
}

var setWindowTitle = async (title) => {
    let result = await invoke('set_window_title', {
        title
    })
    return result
}

var uploadFile = async (dir, name, content) => {
    let result = await invoke('write_media_file', {
        dir: dir,
        name: name,
        content: content,
    })
    return result
}

var createFile = async (file_path) => {
    let result = await invoke('create_file', {
        filePath: file_path,
    })
    return result
}

var deleteFile = async (file_path) => {
    let result = await invoke('delete_file', {
        filePath: file_path,
    })
    return result
}

var deleteFolder = async (file_path) => {
    let result = await invoke('delete_folder', {
        filePath: file_path,
    })
    return result
}

var createDir = async (file_path) => {
    let result = await invoke('create_dir', {
        filePath: file_path,
    })
    return result
}


var renameFile = async (filePath, newFilePath) => {
    let result = await invoke('rename_file', {
        filePath: filePath,
        newFilePath: newFilePath
    })
    return result
}

var fileExists = async (filePath) => {
    let result = await invoke('file_exists', {
        filePath: filePath,
    })
    return result
}


var splitMySQLLine = (dataString) => {
    let parts = dataString.split('\n')
    parts.shift()
    return parts
}

var updateOuterHost = async (host, privateKeyPath, oldHost, newHost) => {
    let result = await invoke('update_outer_host', {
        host, privateKeyPath, oldHost, newHost
    })
    return result
}

var listFiles = async (sessionKey, path) => {
    let result = await invoke('list_files', {
        sessionKey, path
    })
    return result
}

var downloadRemoteFile = async (sessionKey, path, localSavePath) => {
    let result = await invoke('download_remote_file', {
        sessionKey, path, localSavePath
    })
    return result
}


var uploadRemoteFile = async (sessionKey, path, localFile) => {
    let result = await invoke('upload_remote_file', {
        sessionKey, path, localFile
    })
    return result
}

var deleteRemoteFile = async (sessionKey, path) => {
    let result = await invoke('exec_command', {
        sessionKey,
        cmdString: "rm -rf " + path
    })
    return result
}



var testServerConnect = async (user, host, authType, authConfig) => {
    let result = await invoke('test_server_connect', {
        user, host, authType, authConfig
    })
    return result
}

var connectServer = async (user, host, authType, authConfig) => {
    let result = await invoke('connect_server', {
        user, host, authType, authConfig
    })
    return result
}


var execCommand = async (sessionKey, cmdString) => {
    console.log(sessionKey, cmdString)
    let result = await invoke('exec_command', {
        sessionKey, cmdString
    })
    return result
}

var getDownloadProgress = async (downloadProgress) => {
    let result = await invoke('get_download_progress')
    return result
}

var getUploadProgress = async (downloadProgress) => {
    let result = await invoke('get_upload_progress')
    return result
}

var sendCancelSignal = async () => {
    let result = await invoke('send_cancel_signal')
    return result
}

export {
    writeFile, readFile, readDir, simpleReadDir, setWindowTitle, uploadFile, createFile, createDir, deleteFile, deleteFolder, renameFile, fileExists, updateOuterHost, listFiles, downloadRemoteFile, uploadRemoteFile, deleteRemoteFile, testServerConnect, connectServer, execCommand, getDownloadProgress, getUploadProgress, sendCancelSignal
}

export default {
    writeFile, readFile, readDir, simpleReadDir, setWindowTitle, uploadFile, createFile, createDir, deleteFile, deleteFolder, renameFile, fileExists, updateOuterHost, listFiles, downloadRemoteFile, uploadRemoteFile, deleteRemoteFile, testServerConnect, connectServer, execCommand, getDownloadProgress, getUploadProgress, sendCancelSignal
}
