import React from 'react';
import '@/styles/globals.css'
import "@arco-design/web-react/dist/css/arco.css";

class ClassApp extends React.Component {
    ref = null
    constructor(props) {
        super(props); // 用于父子组件传值
        this.state = {
            headTitle: null,
            collapsed: null,
            marginLeft: '',
        }
    }

    render() {
        const { Component, pageProps } = this.props

        return <div style={{ padding: '10px' }}>
            <Component {...pageProps} />
        </div>
    }
}
export default ClassApp