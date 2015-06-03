/* 
 更新到VTree
 */
var updateVTree = {
    text: function (vnode, elem, value, data) {
        if (!vnode.childNodes.length) {
            var array = VNodes(elem.childNodes)
            vnode.appendChild(array)
        } else {
            array = VNodes(elem.childNodes)
            array = collectTextNode(array, vnode.childNodes)
            vnode.childNodes.length = 0
            vnode.appendChild(array)
        }
        fillSignatures(vnode, data, new VText(value))
    },
    html: function (vnode, elem, val, data) {
        if (!elem)
            return
        if (!vnode.childNodes.length) {
            var array = VNodes(elem.childNodes)
            vnode.appendChild(array)
        } else {
            array = VNodes(elem.childNodes)
            array = collectHTMLNode(array, vnode.childNodes)
            vnode.childNodes.length = 0
            vnode.appendChild(array)
        }
        //转换成文档碎片

        var fill = new VNode(val, true)
        console.log(fill)
        fillSignatures(vnode, data, fill)
//        elem.insertBefore(fragment, comments[1])
//        scanNodeArray(fill.childNodes, data.vmodels)
//        delete vnode.htmlData
//        delete vnode.htmlValue
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
               token = neo.nodeValue+":end"
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
    elem.innerHTML = elem.textContent = "<ms-attr-fix=1>"
    return attrs
}

function VNode(element, deep) {
    var ret
    switch (element.nodeType) {
        case 11:
            ret = new VDocumentFragment()
            deep && ap.forEach.call(element.childNodes, function (node) {//添加属性
                var vnode = new VNode(node, deep)
                console.log("111")
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