import { writeTextFile, BaseDirectory, readTextFile } from '@tauri-apps/api/fs';
import dayjs from 'dayjs';

const SERVERS = "servers";
const RIP_LIST = "rip_list"


var getJSON = async (key) => {
    try {
        let value =  await readTextFile(key, { dir: BaseDirectory.Cache });
        return JSON.parse(value)
    } catch(e) {
        return null
    }
}

var setJSON = async (key, value) => {
    try {
        return await writeTextFile(key, JSON.stringify(value), { dir: BaseDirectory.Cache });
    } catch(e) {
        return false;
    }
}


var getServers = async () => {
    return await getJSON(SERVERS)
}

var setServers = async (list) => {
    return await setJSON(SERVERS, list)
}

var getRIPList = async () => {
    return await getJSON(RIP_LIST)
}

var setRIPList = async (list) => {
    return await setJSON(RIP_LIST, list)
}

export default {
   getServers, setServers, getRIPList, setRIPList
}