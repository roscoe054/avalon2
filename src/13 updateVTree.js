/* 
 更新到VTree
 */
var updateVTree = {
    text: function (vnode, elem, value, data) {
        if (!vnode.childNodes.length) {
            var array = new VNodes(elem.childNodes)
            vnode.appendChild(array)
        } else {
            array = new VNodes(elem.childNodes)
            array = collectTextNode(array, vnode.childNodes)
            vnode.childNodes.length = 0
            vnode.appendChild(array)
        }
        fillSignatures(vnode, data, new VText(value))
    },
    html: function (vnode, elem, val, data) {
      
        if (!vnode.childNodes.length) {
            var array = new VNodes(elem.childNodes)
            vnode.appendChild(array)
        } else {
            array = new VNodes(elem.childNodes)
            array = collectHTMLNode(array, vnode.childNodes)
            vnode.childNodes.length = 0
            vnode.appendChild(array)
        }
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

//收集两个注释节点间的文本节点
function collectTextNode(aaa, bbb) {//aaa为新的， bbb为旧的
    var collect = false
    var array = []
    while (aaa.length) {
        var neo = aaa.shift()
        array.push(neo)
        if (neo.nodeType === 8 && neo.nodeValue.indexOf("v-text") === 0) {
            collect = !collect
            if (collect) {
                var arr = getSignature(bbb, neo.nodeValue)
                if (arr.length) {
                    array = array.concat(arr)
                }
            }
        } else {
            if (collect) {
                array.pop()
            }
        }
    }
    return array
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
        if (neo.nodeType === 8 && neo.nodeValue.indexOf("v-html") == 0) {
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
    elem.innerHTML = elem.textContent = "<ms ms-if=bbb>"
    return attrs
}

function VNode(element, deep) {
    var ret
    switch (element.nodeType) {
        case 11:
            ret = new VDocumentFragment()
            deep && ap.forEach.call(element.childNodes, function (node) {//添加属性
                var vnode = new VNode(node, deep)
                ret.appendChild(vnode)
            })
            return ret
        case 1:
            ret = new VElement(element)
            if (deep) {
                var attributes = getAttributes ? getAttributes(element) : element.attributes
                ap.forEach.call(attributes, function (attr) {//添加属性
                    if (attr.name !== "class") {
                        ret.props[attr.name] = attr.value
                    }
                })
                ap.forEach.call(element.childNodes, function (node) {
                    var vnode = new VNode(node, deep)
                    ret.appendChild(vnode)
                })
            }
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
    for (var i = 0, n = nodes.length; i < n; i++) {
        ret.push(new VNode(nodes[i], false))
    }
    return ret
}

function DNode(element) {
    var ret
    switch (element.nodeType) {
        case 11:
            ret = DOC.createDocumentFragment()
            ap.forEach.call(element.childNodes, function (node) {//添加属性
                ret.appendChild(new DNode(node))
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
            ap.forEach.call(element.childNodes, function (node) {//添加属性
                ret.appendChild(new DNode(node))
            })
            return ret
        case 3:
            return  DOC.createTextNode(element.nodeValue)
        case 8:
            return  DOC.createComment(element.nodeValue)
    }
}


//处理路标系统的三个重要方法
function getSignatures(elem, signature) {
    var comments = []
    for (var i = 0, el; el = elem.childNodes[i++]; ) {
        if (el.nodeType === 8 && el.nodeValue.indexOf(signature) === 0) {
            comments.push(el)
        }
    }
    return comments
}

function getSignature(array, signature) {
    var collect = false, ret = []
    for (var i = 0, el; el = array[i++]; ) {
        if (el.nodeType === 8 && el.nodeValue.indexOf(signature) === 0) {
            collect = !collect
            continue
        }
        if (collect) {
            ret.push(el)
        }
    }
    return ret
}

function appendSignatures(elem, data, replace) {
    //文本绑定与html绑定当elem为文本节点
    //或include绑定，当使用了data-duplex-replace辅助指令时
    //其左右将插入两个注释节点，自身被替换
    var parent = elem.parentNode
    if (parent.queryVID) {
        start = new VComment(data.signature)
        end = new VComment(data.signature + ":end")
    } else {
        var start = DOC.createComment(data.signature)
        var end = DOC.createComment(data.signature + ":end")
    }

    if (replace) {
        parent.insertBefore(start, elem)
        parent.replaceChild(end, elem)
        data.element = end
    } else {
        avalon.clearHTML(elem)
        elem.appendChild(start)
        elem.appendChild(end)
    }
    return [start, end]
}

function fillSignatures(elem, data, fill, callback) {
    var comments = getSignatures(elem, data.signature)
    callback = callback || function () {
    }
    //移除两个注释节点间的节点
    //console.log(comments)
    if (!comments.length) {
        log(data.signature + "!找不到元素")
        return
    }
    var index = indexElement(comments[0], elem.childNodes) //avalon.slice(elem.childNodes).indexOf(comments[0])
    while (true) {
        var node = elem.childNodes[index + 1]
        if (node && node !== comments[1]) {
            elem.removeChild(node)
            callback(node, comments[0], comments[1])
        } else {
            break
        }
    }
    elem.insertBefore(fill, comments[1])
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
            vnode = new VElement(elem, VTree)
        }
        return data.vnode = vnode
    }
}
function indexElement(target, array) {
    for (var i = 0, el; el = array[i]; i++) {
        if (el === target)
            return i
    }
    return -1
}

//include,duplex,
//text,html,visible,css,attr,data,if,src,href