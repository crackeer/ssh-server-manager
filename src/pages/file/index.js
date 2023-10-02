import React from "react";
import { open } from "@tauri-apps/api/dialog";
import { writeText } from "@tauri-apps/api/clipboard";
import JSONEditor from "@/component/JSONEditor";
import Bread from "@/component/Bread"
import common from "@/util/common";
import {
    Button,
    Message,
    List,
    Space,
    Avatar,
    Form,
    Input,
    Table,
    Popover,
    Modal,
    Radio,
    Divider,
    Link,
    Progress,
    Alert
} from "@arco-design/web-react";
import { IconArrowDown, IconDelete, IconUpload, IconRefresh, IconObliqueLine, IconFolderAdd, IconHome, IconLoading } from '@arco-design/web-react/icon';

import invoke from "@/util/invoke";
import cache from "@/util/cache";
import { partial } from "filesize";
const getFileSize = partial({ base: 2, standard: "jedec" });

async function generateQuickDirs(directory) {
    let sep = '/';
    let parts = directory.split(sep)
    let list = []
    for (var i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
            list.push({
                path: parts.slice(0, i + 1).join(sep),
                name: parts[i]
            })
        }
    }
    return list
}

const StatusDoing = "1"
const StatusCanceling = "2"
const StatusCanceled = "3"
const StatusDown = "4"

const StatusMap = {
    1: '下载中',
    2: '取消中',
    3: '已取消',
    4: '完成'
}

const StatusUploading = "1"

class App extends React.Component {
    columns = [
        {
            'title': '名字',
            'dataIndex': 'name',
            'key': 'name',
            'render': (col, record, index) => (
                record.is_dir ? <a href="javascript:;" onClick={this.selectDir.bind(this, record.name)} style={{ textDecoration: 'none' }}>{record.name}</a> : <span>{record.name}</span>
            )
        },
        {
            'title': '权限',
            'dataIndex': 'access',
            'key': 'access',
        },
        {
            'title': '时间',
            'dataIndex': 'time',
            'key': 'month',
            'render': (col, record, index) => (
                <>
                    {record.month} {record.day} {record.time}
                </>
            )

        },
        {
            'title': '大小',
            'dataIndex': 'size_text',
            'key': 'size_text',
        },
        {
            'title': '用户',
            'dataIndex': 'user',
            'key': 'user',
        },
        {
            'title': '操作',
            'key': 'opt',
            'align': 'center',
            'render': (col, record, index) => {
                return <Space>
                    <Button onClick={this.downloadRemoteFile.bind(this, record)} size="mini" type='text' icon={<IconArrowDown />} >下载</Button>
                    <Button onClick={this.deleteRemoteFile.bind(this, record)} size="mini" type='text' icon={<IconDelete />} status="danger">删除</Button>
                </Space>
            }
        }
    ]
    constructor(props) {
        super(props);
        this.state = {
            sessionKey: '',
            serverIP: '',
            user: '',

            directory: '/',
            quickDirs: [],
            files: [],
            fileLoading: false,
            visible: false,
            newDirName: '',

            downloadStatus: 0,
            downloadFile: '',
            progress: {},
            downloadList: [],

            showUploadPanel: false,
            uploadProgress: {
                'total_size': 100,
                'uploaded_size': 0
            },
            uploadStatus: 0,
            uploadRemoteFile: ''
        };
    }

    async componentDidMount() {
        let sessionKey = common.getQuery('session_key', '')
        let serverIP = common.getQuery('server_ip', '')
        let user = common.getQuery('user', '')
        let list = await cache.getRIPList() || []
        await this.setState({
            sessionKey: sessionKey,
            serverIP: serverIP,
            ripList: list,
            user: user,
            directory: this.getHome(user)
        })
        setTimeout(this.listFiles, 200)
    }
    getHome(user) {
        if (user == 'root') {
            return '/root'
        }
        return '/home/' + user
    }
    goHome = async () => {
        await this.setState({
            directory: this.getHome(this.state.user)
        })
        setTimeout(this.listFiles, 200)
    }
    listFiles = async () => {
        await this.setState({
            fileLoading: true
        })

        let result = await invoke.listFiles(this.state.sessionKey, this.state.directory)
        if (!result.success) {
            Message.error(result.message)
            await this.setState({
                fileLoading: false
            })
            return
        }
        result.data.sort((a, b) => {
            if (a.is_dir) {
                return -1
            }
            return 1
        })
        let fileList = result.data
        for (var i in fileList) {
            fileList[i]['size_text'] = getFileSize(fileList[i]['size'])
        }
        let quickDirs = await generateQuickDirs(this.state.directory)

        await this.setState({
            files: fileList,
            quickDirs: quickDirs,
            fileLoading: false
        })
    }
    gotoDir = async (item) => {
        await this.setState({
            directory: item.path,
            files: [],
        })
        setTimeout(this.listFiles, 100)
    }
    selectDir = async (name) => {
        let dir = this.state.directory + "/" + name
        await this.setState({
            directory: dir,
            files: [],
            fileLoading: true
        })
        setTimeout(this.listFiles, 100)
    }
    downloadRemoteFile = async (record) => {
        let selected = await open({
            directory: true,
            multiple: false,
            filters: [{
                name: 'directory',
                extensions: [],
            }],
        });
        if (selected == null) {
            return
        }
        let downloadList = await this.getDownloadList(this.state.directory, record, selected)
        console.log(downloadList)
        await this.setState({
            downloadStatus: StatusDoing,
            showDownloadPanel: true,
            downloadList: downloadList,
        })
        this.getDownloadProgress()
        for (var i = 0; i < downloadList.length; i++) {
            downloadList[i].status = '下载中'
            downloadList[i].downloading = true
            await this.setState({
                downloadList: downloadList,
            })
            if (this.state.downloadStatus == StatusCanceling) {
                downloadList[i].color = '#E39705FF'
                downloadList[i].status = '已取消'
            } else {
                let result = await invoke.downloadRemoteFile(this.state.sessionKey, downloadList[i].remote_file, downloadList[i].local_file)
                if (result.success) {
                    downloadList[i].color = '#339966'
                    downloadList[i].status = '成功'
                } else if (this.state.downloadStatus == StatusCanceling) {
                    downloadList[i].color = '#E39705FF'
                    downloadList[i].status = '已取消'
                } else {
                    downloadList[i].color = '#FF6666'
                    downloadList[i].status = '失败'
                }

            }
            downloadList[i].downloading = false
            await this.setState({
                downloadList: downloadList,
            })
        }
        await this.setState({
            downloadStatus: this.state.downloadStatus == StatusCanceling ? StatusCanceled : StatusDown
        })
    }
    getDownloadList = async (currentDir, record, savePath) => {
        const { join } = await import('@tauri-apps/api/path');
        let localSavePath = await join(savePath, record.name)
        let remoteFile = currentDir + "/" + record.name
        if (!record.is_dir) {
            return [{
                'remote_file': remoteFile,
                'local_file': localSavePath,
                'status': '等待',
                'color': '#CCCCCC',
                'downloading': false,
            }]
        }
        let downloadList = [];
        let data = await invoke.listFiles(this.state.sessionKey, remoteFile)
        for (var i in data.data) {
            let tmp = await this.getDownloadList(remoteFile, data.data[i], localSavePath)
            downloadList.push(...tmp)
        }
        return downloadList
    }
    getDownloadProgress = async () => {
        let result = await invoke.getDownloadProgress()
        await this.setState({
            progress: result.data
        })
        if (this.state.downloadStatus == StatusDoing) {
            setTimeout(this.getDownloadProgress, 1000)
        }
    }

    uploadFile2Remote = async () => {
        let selected = await open({
            directory: false,
            multiple: false,
        });
        if (selected == null) {
            return
        }
        const { sep } = await import('@tauri-apps/api/path');
        let parts = selected.split(sep)
        let remoteFile = this.state.directory + '/' + parts[parts.length - 1]
        await this.setState({
            uploadStatus: StatusDoing,
            showUploadPanel: true,
            uploadRemoteFile: remoteFile,
        })
        this.getUploadProgress()
        let result = await invoke.uploadRemoteFile(this.state.sessionKey, remoteFile, selected)
        if (!result.success) {
            Message.error(result.message)
        }
        await this.setState({
            uploadStatus: this.state.uploadStatus == StatusCanceling ? StatusCanceled : StatusDown
        })
        await this.listFiles()
    }
    getUploadProgress = async () => {
        let result = await invoke.getUploadProgress()
        console.log(result)
        await this.setState({
            uploadProgress: result.data
        })
        if (this.state.uploadStatus == StatusDoing) {
            setTimeout(this.getUploadProgress, 1000)
        }
    }

    deleteRemoteFile = async (item) => {
        const { confirm } = await import('@tauri-apps/api/dialog');
        const confirmed = await confirm('确认删除该文件（夹）', '删除提示');
        if (confirmed) {
            let remoteFile = this.state.directory + '/' + item.name
            let result = await invoke.deleteRemoteFile(this.state.sessionKey, remoteFile)
            if (result.success) {
                Message.success('删除成功')
                await this.listFiles()
            } else {
                Message.error(result.message)
            }

        }
    }
    doNewDir = async () => {
        if (this.state.newDirName.length > 0) {
            let remoteFile = this.state.directory + '/' + this.state.newDirName
            console.log(remoteFile)
            let result = await invoke.execCommand(this.state.sessionKey, 'mkdir -p ' + remoteFile)
            console.log(result)
            if (result.success) {
                Message.success('创建成功')
                await this.setState({ visible: false })
                await this.listFiles()
            } else {
                Message.error(result.message)
            }
        }
    }
    cancelDownload = async () => {
        await this.setState({
            downloadStatus: StatusCanceling,
        })
        await invoke.sendCancelSignal()
    }
    cancelUpload = async () => {
        await invoke.sendCancelSignal()
        this.setState({
            uploadStatus: StatusCanceling,
        })
    }

    render() {
        let downloadStatusText = StatusMap[this.state.downloadStatus]
        return (
            <>
                <Bread nodes={[<strong>文件查看</strong>, <Space split={<IconObliqueLine />} align={'center'} style={{ marginRight: '0' }}>
                    <Link onClick={this.gotoDir.bind(this, { path: '/' })} key={'/'}>根目录</Link>
                    {
                        this.state.quickDirs.map(item => {
                            return <Link onClick={this.gotoDir.bind(this, item)} key={item.path}>{item.name}</Link>
                        })
                    }
                </Space>]} serverIP={this.state.serverIP} />

                <div style={{ paddingBottom: '10px', textAlign: 'right' }}>
                    <Space>
                        <Button onClick={this.goHome} type='primary' size='small' icon={<IconHome />}>家目录</Button>
                        <Popover
                            title='请输入名字'
                            trigger='click'
                            popupVisible={this.state.visible}
                            onVisibleChange={(val) => {
                                this.setState({ visible: val })
                            }}
                            content={
                                <>
                                    <Input size='small' value={this.state.newDirName} onChange={(val) => { this.setState({ newDirName: val }) }} />
                                    <p style={{ textAlign: 'right' }}>
                                        <Button onClick={this.doNewDir}  type='primary'>确认</Button>
                                    </p>
                                </>
                            }
                        >
                            <Button onClick={this.newDirectory} type='primary' icon={<IconFolderAdd />}>新建文件夹</Button>
                        </Popover>
                        <Button onClick={this.uploadFile2Remote} type='primary'  icon={<IconUpload />}>上传文件</Button>
                        <Button onClick={this.listFiles} type='primary' icon={<IconRefresh />} >更新</Button>
                    </Space>
                </div>

                <Table data={this.state.files} columns={this.columns} pagination={false} rowKey={'name'}
                    scroll={{ y: 1000 }} footer={this.state.directory} loading={this.state.fileLoading} />

                <Modal visible={this.state.showDownloadPanel} title={"文件下载【" + downloadStatusText + "】"} style={{ width: '75%' }} footer={null} onCancel={() => {
                    this.setState({ showDownloadPanel: false });
                }} closable={false} mask={true} escToExit={false} maskClosable={false}>
                    <List dataSource={this.state.downloadList} size={'small'} render={(item, index) => {
                        return <List.Item key={index}>
                            <List.Item.Meta
                                avatar={
                                    item.downloading ? <Progress type='circle' percent={(this.state.progress.download_size / this.state.progress.total_size * 100).toFixed(2)} status='warning' size="small" />
                                        : <Avatar shape='square' style={{ backgroundColor: item.color }}>{item.status}</Avatar>}
                                title={'远程：' + item.remote_file}
                                description={'本地:' + item.local_file}
                            />
                        </List.Item>
                    }} style={{ height: '600px', overflow: 'scroll' }} />
                    <p style={{ textAlign: 'center' }}>
                        {
                            this.state.downloadStatus == StatusDoing ? <Button type="primary" status="danger" onClick={this.cancelDownload}>取消</Button> : null
                        }
                        {
                            this.state.downloadStatus > StatusDoing ? <Button type="primary" onClick={() => {
                                this.setState({ showDownloadPanel: false });
                            }}>关闭</Button> : null
                        }

                    </p>
                </Modal>
                <Modal visible={this.state.showUploadPanel} title="文件上传" style={{ width: '75%' }} footer={null} onCancel={() => {
                    this.setState({ showUploadPanel: false });
                }} closable={false} mask={true} escToExit={false} maskClosable={false}>
                    <p>
                        文件：{this.state.uploadRemoteFile}
                    </p>
                    <Progress percent={(this.state.uploadProgress.upload_size / this.state.uploadProgress.total_size * 100).toFixed(2)} status='warning' size="small" />
                    {
                          this.state.uploadStatus == StatusCanceled ? <Alert content="用户已取消"></Alert> : null
                    }
                    
                    <p>
                        {
                            this.state.uploadStatus == StatusDoing ? <Button type="primary" status="danger" onClick={this.cancelUpload}>取消</Button> : null
                        }
                        {
                            this.state.uploadStatus > StatusDoing ? <Button type="primary" onClick={() => {
                                this.setState({ showUploadPanel: false });
                            }}>关闭</Button> : null
                        }
                    </p>
                </Modal>
            </>
        );
    }
}

export default App;
