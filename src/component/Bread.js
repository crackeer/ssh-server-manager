import { Divider } from "@arco-design/web-react";
import { Breadcrumb } from '@arco-design/web-react';
const BreadcrumbItem = Breadcrumb.Item;
const Bread = (props) => {
    return <div>
        <Breadcrumb>
            <BreadcrumbItem><a href="/">首页</a> </BreadcrumbItem>
            {props.serverIP != undefined ?  <BreadcrumbItem ><strong>{props.serverIP}</strong></BreadcrumbItem> : null}
           
            {props.nodes.map(item => {
                return  <BreadcrumbItem >{item}</BreadcrumbItem>
            })}
           
        </Breadcrumb>
        <Divider></Divider>
    </div>
}

export default Bread