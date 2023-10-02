import React from "react";
import { open } from "@tauri-apps/api/dialog";
import {
    Button,
    Message,
    Grid,
    Space,
    Steps,
    Form,
    Input,
    Table,
    Popover,
    Modal,
    Radio
} from "@arco-design/web-react";
import { IconDelete } from "@arco-design/web-react/icon";
import cache from "@/util/cache";
import invoke from "@/util/invoke";
import common from "@/util/common";
const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;
const Step = Steps.Step;
const RadioGroup = Radio.Group;


class App extends React.Component {
    columns = [
        {
            title: "服务器IP",
            dataIndex: "server_ip",
            key: "server_ip",
        },
        {
            title: "用户",
            dataIndex: "user",
            key: "user",
        },
        {
            title: "认证方式",
            dataIndex: "auth_type",
            key: "auth_type",
            render: (col, record, index) => {
                if(record.auth_type == 'password') {
                    return '密码'
                }
                return '密钥'
            }
        },
        {
            title: "配置",
            dataIndex: "auth_config",
            key: "auth_config",
            render: (col, record, index) => {
                if(record.auth_type == 'password') {
                    return '********'
                }
                return record.auth_config
            }
        },
        {
            title: "操作",
            key: 'opt',
            render: (col, record, index) => {
                return (
                    <Space>
                        <Button
                            onClick={this.connectServer.bind(this, record, "/file")}
                            size="mini"
                            type="text"
                        >
                            文件管理
                        </Button>
                        <Button
                            onClick={this.deleteServer.bind(this, index)}
                            size="mini"
                            type="text"
                            icon={<IconDelete />}
                            status="danger"
                        >
                            删除
                        </Button>
                    </Space>
                );
            },
        }
    ]
    constructor(props) {
        super(props);
        this.state = {
            serverList: [],
            step: 1,
            host: '',
            user: '',
            authType: 'password',
            authConfig: '',

            privateKeyPath: "",
            localConfig: {},
            oldOuterHost: "",
            newOuterHost: "",

            directory: "/",
            quickDirs: [],
            files: [],
            fileLoading: false,
            visible: false,
            newDirName: "",
        };
    }
    async componentDidMount() {
        let list = await cache.getServers();
        await this.setState({
            serverList: list || []
        });
    }
    doSaveCacheHost = async () => {
        await cache.setCacheHost({
            host: this.state.host,
            privateKeyPath: this.state.privateKeyPath,
        });
        await this.setState({
            editing: false,
        });
        Message.success("保存成功");
    };
    connectServer = async (item, path) => {
        let result = await invoke.connectServer(item.user, item.server_ip, item.auth_type, item.auth_config)
        console.log(result)
        if (!result.success) {
            Message.error(result.message)
            return
        }
        let query = common.httpBuildQuery({
            'session_key': result.data.session_key,
            'server_ip': item.server_ip,
            'user': item.user
        })
        window.location.href = path + '?' + query
    }
    deleteServer = async (index) => {
        let list = this.state.serverList.filter((_, i) => {
            return i != index
        })
        await this.setState({
            serverList: list,
        })
        cache.setServers(list)
    }

    selectPrivateKeyPath = async () => {
        let selected = await open({
            directory: false,
            multiple: false,
            filters: [
                {
                    name: "File",
                    extensions: ["txt"],
                },
            ],
        });
        if (selected == null || selected.length < 1) {
            return;
        }
        this.setState({
            authConfig: selected,
        });
    };
    doAddServer = async () => {
        if (this.state.host.length < 1 || this.state.user.length < 1 || this.state.authConfig.length < 1) {
            return
        }
        let result = await invoke.testServerConnect(this.state.user, this.state.host, this.state.authType, this.state.authConfig)
        if (!result.success) {
            Message.error(result.message)
            return
        }

        let data = JSON.parse(JSON.stringify(this.state.serverList));
        data.push({
            user: this.state.user,
            server_ip: this.state.host,
            auth_type: this.state.authType,
            auth_config: this.state.authConfig,
        })
        await this.setState({
            serverList: data,
            visible: false,
        })
        cache.setServers(data)
    }

    render() {
        return (
            <>
                <div style={{ padding: "0px 10%" }}>
                    <h2>服务器列表<Button onClick={() => {
                        this.setState({
                            visible: true
                        })
                    }} size="mini" type="primary">新建</Button></h2>
                    <Table data={this.state.serverList} columns={this.columns} pagination={false} />
                </div>

                <Modal visible={this.state.visible} title="新建服务器" onCancel={() => {
                    this.setState({ visible: false })
                }} style={{ width: '50%' }} onConfirm={this.doAddServer}>
                    <Form autoComplete="off">
                        <FormItem label="服务器IP">
                            <Input
                                placeholder="服务器IP"
                                onChange={(val) => {
                                    this.setState({ host: val });
                                }}
                                value={this.state.host}
                            />
                        </FormItem>
                        <FormItem label="用户">
                            <Input
                                placeholder="登录用户"
                                onChange={(val) => {
                                    this.setState({ user: val });
                                }}
                                value={this.state.user}
                            />
                        </FormItem>
                        <FormItem label="认证方式">
                            <RadioGroup defaultValue={this.state.authType} onChange={(val) => {
                                this.setState({ authType: val });
                            }}>
                                <Radio value='password'>密码</Radio>
                                <Radio value='private_key'>密钥</Radio>
                            </RadioGroup>
                        </FormItem>
                        {
                            this.state.authType == 'password' ? <FormItem label="密码">
                                <Input
                                    placeholder="请填写服务内网IP"
                                    onChange={(val) => {
                                        this.setState({ authConfig: val });
                                    }}
                                    type="password"
                                    value={this.state.authConfig}
                                />
                            </FormItem> : <FormItem label="密钥">
                                {this.state.authConfig}
                                <Button onClick={this.selectPrivateKeyPath}>Select</Button>
                            </FormItem>
                        }
                    </Form>
                </Modal>
            </>
        );
    }
}

export default App;
