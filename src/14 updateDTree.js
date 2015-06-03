/* 
 将VTree中的数据同步到DTree 
 */

var updateDTree = {
    "if": function (vnode, elem) {
        var data = vnode.ifData
        elem = data.element
        try {
            if (!elem.parentNode)
                return
        } catch (e) {
            return
        }
        if (vnode.ifValue) {
            if (elem.nodeType === 8) {
                elem.parentNode.replaceChild(data.template, elem)
                elem = data.element = data.template //这时可能为null
            }
            if (elem.getAttribute(data.name)) {
                elem.removeAttribute(data.name)
                scanAttr(elem, data.vmodels)
            }
            data.rollback = null
        } else { //移出DOM树，并用注释节点占据原位置
            if (elem.nodeType === 1) {
                var node = data.element = DOC.createComment("ms-if")
                //在IE6-8中不能对注释节点添加uniqueNumber属性
                node.vid = elem.uniqueNumber
                elem.parentNode.replaceChild(node, elem)
                data.template = elem //元素节点
                ifGroup.appendChild(elem)
                data.rollback = function () {
                    if (elem.parentNode === ifGroup) {
                        ifGroup.removeChild(elem)
                    }
                }
            }
        }
        delete vnode.ifValue
        delete vnode.ifData
    },
    text: function (vnode, elem) {
        var rnodes = elem.childNodes
        var vnodes = vnode.childNodes
        var modify = false
        for (var i = 0, node; node = vnodes[i]; i++) {
            var virtual = vnodes[i]
            var real = rnodes[i]
            if (virtual.nodeType === 8 && virtual.nodeValue.indexOf("v-text") === 0) {
                modify = !modify
                continue
            }
            if (modify) {
                if (real.nodeType !== 3) {
                    real.parentNode.insertBefore(DOC.createTextNode(virtual.nodeValue), real)
                } else {
                    real.nodeValue = virtual.nodeValue
                }
            }
        }
    },
    css: function (vnode, elem) {
        for (var i in vnode.style) {
            if (elem.style[i] !== vnode.style[i]) {
                avalon(elem).css(i, vnode.style[i])
            }
        }
        vnode.style = {}
    },
    attr: function (vnode, elem) {
        for (var attrName in vnode.props) {
            if (vnode.props.hasOwnProperty(attrName)) {
                var val = vnode.props[attrName]
                var toRemove = (val === false) || (val === null) || (val === void 0)
                if (val && typeof val === "object") {
                    elem[attrName] = val
                    continue
                }
                if (!W3C && propMap[attrName]) { //旧式IE下需要进行名字映射
                    attrName = propMap[attrName]
                }
                var bool = boolMap[attrName]
                if (typeof elem[bool] === "boolean") {
                    elem[bool] = !!val //布尔属性必须使用el.xxx = true|false方式设值
                    if (!val) { //如果为false, IE全系列下相当于setAttribute(xxx,''),会影响到样式,需要进一步处理
                        toRemove = true
                    }
                }
                if (toRemove) {
                    elem.removeAttribute(attrName)
                    continue
                }
                //SVG只能使用setAttribute(xxx, yyy), VML只能使用elem.xxx = yyy ,HTML的固有属性必须elem.xxx = yyy
                var isInnate = rsvg.test(elem) ? false : (DOC.namespaces && isVML(elem)) ? true : attrName in elem.cloneNode(false)
                if (isInnate) {
                    elem[attrName] = val
                } else {
                    elem.setAttribute(attrName, val)
                }
            }
        }
    }
}


//创建虚拟DOM的根节点
var VTree = avalon.VTree = new VElement(root)
//scanTag 遇到ms-controller会创建一个VElement添加到VTree
var reID
function globalRender() {
    clearTimeout(reID)
    reID = setTimeout(function () {//以后这里改为Promise
        refreshTree()
    }, 4)
}
function refreshTree() {
    avalon.log("更新视图")
    updateTree(VTree)
}
function querySelector(tag, vid, root) {
    root = root || document
    var nodes = root.getElementsByTagName(tag)
    for (var i = 0, node; node = nodes[i++]; ) {
        if (node.vid === vid)
            return node
    }
}
function updateTree(node) {
    if (node.dirty) {
        var rnode = querySelector(node.nodeName, node.vid)
        if (!rnode)
            return
        node.tasks.forEach(function (task) {
            task(node, rnode)
        })
        node.tasks.length = 0
        node.dirty = false
    }
    if (node.childNodes && node.childNodes.length) {
        for (var i = 0, el; el = node.childNodes[i++]; ) {
            if (el.nodeType === 1) {
                updateTree(el)
            }
        }
    }
}