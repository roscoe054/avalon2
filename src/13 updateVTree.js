/* 
 更新到VTree
 */
var updateVTree = {
    text: function (vnode, elem, value, data) {
        var fill = new VDocumentFragment()
        fill.appendChild(new VText(value))
        fillSignatures(vnode, data, fill)
    },
    html: function (vnode, elem, val, data) {
//        if (!vnode.childNodes.length) {
//            var array = new VNodes(elem.childNodes)
//            vnode.appendChild(array)
//        } else {
//            array = new VNodes(elem.childNodes)
//            array = collectHTMLNode(array, vnode.childNodes)
//            vnode.childNodes.length = 0
//            vnode.appendChild(array)
//        }
        //转换成文档碎片
        var fill = new VNode(val, true)
        fillSignatures(vnode, data, fill)
        scanNodeArray(fill.childNodes, data.vmodels)
    }
//if 直接实现在bindingExecutors.attr
//css 直接实现在bindingExecutors.attr
//attr 直接实现在bindingExecutors.attr
//data 直接实现在bindingExecutors.data 
}



function collectHTMLNode(aaa, bbb) {//aaa为新的， bbb为旧的
    var k = false
    var array = []
    var token
    // 新 1111 <!v-html1234> 2222 <!v-html2222> 3333 <!v-html2222> 4444 <!v-html1234> 5555
    // 旧 1111 <!v-html1234>  <!v-html1234> 5555
    while (aaa.length) {
        var neo = aaa.shift()
        array.push(neo)
        if (neo.nodeType === 8 && neo.nodeValue.indexOf("v-html") === 0) {
            if (!k) {
                token = neo.nodeValue + ":end"
                k = true
            } else {
                k = neo.nodeValue.indexOf(token) === 0
            }
//   k = !k
            if (k) {
                var arr = getSignature(bbb, neo.nodeValue)
                if (arr.length) {
                    array = array.concat(arr)
                }
            }
        } else {
            if (k) {
                array.pop()
            }
        }
    }
    return array
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

//让avalon的VNode能顺利在scanAttr中运作
function getVAttributes(elem) {
    var attrs = []
    for (var i in elem.props) {
        if (elem.props.hasOwnProperty(i)) {
            attrs.push({
                name: i,
                value: elem.props[i],
                specified: true
            })
        }
    }

    return attrs
}
//将真实DOM转换为虚拟DOM
function VNode(element) {
    var ret
    switch (element.nodeType) {
        case 11:
            ret = new VDocumentFragment()

            avalon.each(element.childNodes, function (index, node) {
                ret.appendChild(new VNode(node))//添加孩子
            })
            return ret
        case 1:
            ret = new VElement(element)
            //只处理显示定义的属性
            var attributes = getAttributes ? getAttributes(element) : element.attributes
            avalon.each(attributes, function (index, attr) {//添加属性
                if (attr.name !== "class") {
                    ret.props[attr.name] = attr.value
                }
            })
            avalon.each(element.childNodes, function (index, node) {
                ret.appendChild(new VNode(node))
            })
            ret.className = element.className
            ret.textContent = element.innerHTML
            return ret
        case 3:
            return new VText(element.nodeValue)
        case 8:
            return new VComment(element.nodeValue)
    }
}
//将虚拟DOM转换为真实DOM
function DNode(element) {
    var ret
    switch (element.nodeType) {
        case 11:
            ret = DOC.createDocumentFragment()
            avalon.each(element.childNodes, function (index, node) {
                ret.appendChild(new DNode(node))//添加孩子
            })
            return ret
        case 1:
            ret = DOC.createElement(element.nodeName)
            if (element.className.trim()) {
                ret.className = element.className
            }
            updateDTree.attr(element, ret)
            updateDTree.css(element, ret)
            ret.vid = element.vid
            avalon.each(element.childNodes, function (index, node) {
                ret.appendChild(new DNode(node))//添加孩子
            })
            return ret
        case 3:
            return  DOC.createTextNode(element.nodeValue)
        case 8:
            return  DOC.createComment(element.nodeValue)
    }
}

function cloneVNode(element) {//克降虚拟DOM
    var ret
    switch (element.nodeType) {
        case 11:
            ret = new VDocumentFragment()
            avalon.each(element.childNodes, function (index, node) {
                ret.appendChild(cloneVNode(node))
            })
            return ret
        case 1:
            ret = new VElement(element)
            avalon.each(element.props, function (name, value) {
                ret.props[name] = value//添加属性 
            })
            avalon.each(element.style, function (name, value) {
                ret.style[name] = value//添加样式
            })
            avalon.each(element.childNodes, function (index, node) {
                ret.appendChild(cloneVNode(node))//添加孩子
            })
            ret.className = element.className
            ret.textContent = element.innerHTML
            delete ret.vid
            getUid(ret)
            return ret
        case 3:
            return new VText(element.nodeValue)
        case 8:
            return new VComment(element.nodeValue)
    }
}

//将一组节点转换为虚拟DOM
function VNodes(nodes) {
    var ret = []
    avalon.each(nodes, function (i, node) {
        ret.push(new VNode(node))
    })
    return ret
}

function addVnodeToData(elem, data) {
    if (data.vnode) {
        return data.vnode
    } else if (elem.isVirtual) {
        return data.vnode = elem
    } else if (elem.nodeType === 1) {
        var vid = getUid(elem)
        var vnode = VTree.queryVID(vid)
        if (!vnode) {
            vnode = new VNode(elem)
            var vparent = VTree.queryVID(elem.parentNode.vid)
            if (vparent) {
                vparent.appendChild(vnode)
            } else {
                VTree.appendChild(vnode)
            }
        }
        return data.vnode = vnode
    }
}
