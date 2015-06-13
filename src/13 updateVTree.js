/* 
 更新到VTree
 */
var updateVTree = {
    text: function (vnode, elem, value, data) {
        var fill = new VDocumentFragment()
        fill.appendChild(new VText(value))
        fillPlaceholders(vnode, data, fill)
    },
    html: function (vnode, elem, val, data) {
        var fill = new VNode(val)
        fillPlaceholders(vnode, data, fill)
        scanNodes(fill.childNodes, data.vmodels, data.signature.replace("v-html",""))
    }
//if 直接实现在bindingExecutors.attr
//css 直接实现在bindingExecutors.attr
//attr 直接实现在bindingExecutors.attr
//data 直接实现在bindingExecutors.data 
}

/*
 <div ms-controller="test">{{aaa|html}}</div>
 
 avalon.define({
 $id: "test",
 aaa: <span>{{bbb}}</span>,
 bbb: "111"
 })
 */

function scanVTree(elem, vmodel) {
    var vmodels = vmodel ? [].concat(vmodel) : []
    scanVTag(elem, vmodels)
}

function scanVTag(elem, vmodels) {
//扫描顺序  ms-skip(0) --> ms-important(1) --> ms-controller(2) --> ms-if(10) --> ms-repeat(100) 
//--> ms-if-loop(110) --> ms-attr(970) ...--> ms-each(1400)-->ms-with(1500)--〉ms-duplex(2000)垫后
    var props = elem.props
    var a = props["ms-skip"]
    //#360 在旧式IE中 Object标签在引入Flash等资源时,可能出现没有getAttributeNode,innerHTML的情形
    if (typeof a === "string") {
        return
    } else if (b) {
        var b = props["ms-important"]
        var c = props["ms-controller"]
        var bvm = avalon.vmodels[b]
        var cvm = avalon.vmodels[c]
        if (bvm) {
//ms-important不包含父VM，ms-controller相反
            delete props["ms-important"]
            vmodels = [bvm]
            avalon(elem).removeClass("ms-important")
        } else if (cvm) {
            delete props["ms-controller"]
            vmodels = [cvm].concat(vmodels)
            avalon(elem).removeClass("ms-controller")
        }
    }
    scanAttr(elem, vmodels) //扫描特性节点
}


function addVnodeToData(elem, data) {
    if (data.vnode) {
        return data.vnode
    } else if (elem.isVirtual) {
        return data.vnode = elem
    } else if (elem.nodeType ) {

        return data.vnode = VTree.queryVID( buildVTree(elem) )
    }
}


var rootID = 1
function buidVID(elem) {//为元素生成data-vid
    var vid = elem.getAttribute("data-vid")
    if (!vid) {
        var parent = elem.parentNode
        if (parent && parent.nodeType === 1) {
            var pid = parent.getAttribute("data-vid")
            if (pid) {
                vid = pid + "." + elem._mountIndex || indexElement(elem, parent.childNodes)
            } else {
                vid = "." + rootID++
            }
            elem.setAttribute("data-vid", vid)
        }
    }
    return vid
}

function buildVTree(elem) {//将此元素生成对应的虚拟DOM,并挂在VTree中
    var vid = buidVID(elem)
    if (!elem.isVirtual) {
        if (!VTree.queryVID(vid)) {
            var vparent = VTree.queryVID(elem.parentNode.getAttribute("data-vid"))
            var vnode = new VElement(elem.nodeName, vparent || VTree)
            vnode.vid = vid
        }
    }
    return vid
}
