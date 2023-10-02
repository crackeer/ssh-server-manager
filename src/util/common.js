const crypto = require('crypto'); 
const lodash = require('lodash');
const dayjs = require('dayjs');



var sortFileList = (fileList) => {
    fileList = fileList.sort((a, b) => {
        if (a.item_type == b.item_type) {
            if (a.path < b.path) {
                return -1
            }
            return 1
        }
        if (a.item_type == 'dir') {
            return -1
        }
        return 1
    })
    return fileList
}


var getRelativePath = (currentDir, rootDir) => {
    if (currentDir == rootDir) {
        return ''
    }
    return currentDir.substr(rootDir.length)
}

var md5 = (str) => {

    // 创建MD5对象  
    let md5 = crypto.createHash('md5');  
      
    // 将字符串转换为字节数组  
    let bytes = str.split('').map(char => char.charCodeAt(0).toString(16)).join('');  
            
    return md5.update(bytes).digest('hex');  
  
}

function getQuery(key, value) {
    let url = new URLSearchParams(window.location.search)
    return url.get(key) || value
}

var calculateCRC32 = (data) => {  
  const crc32 = new Uint32Array(data);  
  const crc32Value = crc32.reduce((acc, curr) => acc ^ curr, 0);  
  return crc32Value;  
}  

var getViewHeight = () => {
    return document.documentElement.clientHeight - 76
}


function httpBuildQuery(query) {
    let params = new URLSearchParams("")
    Object.keys(query).forEach(k => {
        params.append(k, query[k])
    })
    return params.toString()
}

function convertTs2Time(ts) {
    return dayjs.unix(ts).format('YYYY-MM-DD HH:mm:ss')
}

function convertDBTime(dbTime) {
    return dayjs(dbTime).format('YYYY-MM-DD HH:mm:ss')
}

function convertDBTime2Unix(dbTime) {
    return dayjs(dbTime).unix()
}

function validateIP(input) {
    var regex =
        /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    return regex.test(input);
}

function getNowTime() {
    return dayjs().format("YYYY-MM-DD HH:mm:ss")
}


export default {
    validateIP, getRelativePath, md5, calculateCRC32, getQuery, getViewHeight,  httpBuildQuery, convertTs2Time, convertDBTime, convertDBTime2Unix, getNowTime
}
export {
    validateIP, getRelativePath, md5, calculateCRC32, getQuery, getViewHeight,  httpBuildQuery, convertTs2Time, convertDBTime, convertDBTime2Unix, getNowTime
}