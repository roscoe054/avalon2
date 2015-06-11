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
    text: function (vnode, parent) {
        var vnodes = vnode.childNodes, placeholder
        var nodesBetweenPlaceholders = []
        var searchIndexInDom = 0
        for (var i = 0, virtual; virtual = vnodes[i]; i++) {
            if (!placeholder && virtual.nodeType === 8 && virtual.nodeValue.indexOf("v-text") === 0) {
                placeholder = virtual.nodeValue + ":end"
                continue
            } else if (placeholder === virtual.nodeValue) {
                if (nodesBetweenPlaceholders.length) {
                   searchIndexInDom = updateNodesBetweenPlaceholders(
                            nodesBetweenPlaceholders, parent,
                            searchIndexInDom, placeholder.slice(0,-4))
                    nodesBetweenPlaceholders.length = 0
                }
                placeholder = false
                continue
            }
            if (placeholder) {
                nodesBetweenPlaceholders.push(virtual)
            }
        }
    },
    html: function (vnode, parent) {
        var vnodes = vnode.childNodes, placeholder
        var nodesBetweenPlaceholders = []
        var searchIndexInDom = 0
        for (var i = 0, virtual; virtual = vnodes[i]; i++) {
            if (!placeholder && virtual.nodeType === 8 && virtual.nodeValue.indexOf("v-html") === 0) {
                placeholder = virtual.nodeValue + ":end"
                continue
            } else if (placeholder === virtual.nodeValue) {
                if (nodesBetweenPlaceholders.length) {
                   searchIndexInDom = updateNodesBetweenPlaceholders(
                            nodesBetweenPlaceholders, parent,
                            searchIndexInDom, placeholder.slice(0,-4))
                    nodesBetweenPlaceholders.length = 0
                }
                placeholder = false
                continue
            }
            if (placeholder) {
                logger2(virtual)
                nodesBetweenPlaceholders.push(virtual)
            }
        }
    },
    repeat: function (vnode, parent) {
        avalon.log("repeat")
        var rnodes = parent.childNodes
        var vnodes = vnode.childNodes

        var collect = false, token
        var keys = {}, newRepeatNodes = [], oldRepeatNodes = [], index = 0
        //收集从<!--v-repeat1213--> 到<!--v-repeat1213:end-->之间的节点,包括第一个<!--v-repeat1213-->
        //将它们放进newRepeatNodes,并在这过程中构建keys对象
        for (var i = 0, virtual; virtual = vnodes[i]; i++) {
            if (!collect && virtual.nodeType === 8 && /^v-(repeat|with|each)/.test(virtual.nodeValue)) {
                token = virtual.nodeValue + ":end"
                collect = true
            } else if (collect && virtual.nodeType === 8 && virtual.nodeValue === token) {
                collect = false
            }
            if (collect) {
                if (virtual.nodeType === 1) {
                    keys[virtual.vid] = index
                } else {
                    if (keys[ virtual.nodeValue]) {
                        keys[ virtual.nodeValue].push(index)
                    } else {
                        keys[ virtual.nodeValue] = [index]
                    }
                }
                newRepeatNodes[index] = virtual
                index++
            }
        }
        //对真实DOM根据keys给出的顺序进行重排，并删掉没用的旧节点，与生成缺少的新节点
        for (var i = 0, node; node = rnodes[i]; i++) {
            if (node.nodeType === 8 && /^v-(repeat|with|each)/.test(node.nodeValue)) {
                token = node.nodeValue + ":end"
                var end = null
                breakLoop:
                        while ((node = rnodes[i])) {
                    if (node.nodeValue === token) {
                        end = node
                        break breakLoop
                    }
                    //收集符合要求的真实DOM
                    parent.removeChild(node)
                    if (node.nodeType === 1) {
                        oldRepeatNodes[keys[node.vid]] = node
                    } else {
                        if (keys[node.nodeValue]) {
                            oldRepeatNodes[ keys[node.nodeValue].shift()] = node
                        }
                    }
                }
                var fragment = DOC.createDocumentFragment()
                for (i = 0; node = newRepeatNodes[i]; i++) {
                    if (oldRepeatNodes[i]) {
                        fragment.appendChild(oldRepeatNodes[i])
                    } else {
                        fragment.appendChild(new DNode(node))
                    }
                }
                parent.insertBefore(fragment, end)
                break
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
                if (val && typeof val === "object") {//处理ms-data-xxx="[object]"
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
                if (attrName === "src" || attrName === "href") {
                    elem[attrName] = val
                    if (window.chrome && elem.tagName === "EMBED") {
                        var parent = elem.parentNode //#525  chrome1-37下embed标签动态设置src不能发生请求
                        var comment = document.createComment("ms-src")
                        parent.replaceChild(comment, elem)
                        parent.replaceChild(elem, comment)
                    }
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

function logger2(a){
    var parentNode = a.parentNode
    var childNodes = a.childNodes
    delete a.parentNode
    delete a.childNodes
    console.log( JSON.stringify(a) )
    a.parentNode = parentNode
    a.childNodes = childNodes
}

//创建虚拟DOM的根节点
root.setAttribute("data-vid", ".0")
var VTree = avalon.VTree = new VElement("HTML")
VTree.vid = ".0"
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
        if (node.getAttribute("data-vid") === vid)
            return node
    }
}
function updateTree(node, element) {
    if (node.dirty) {
        var rnode = querySelector(node.nodeName, node.getAttribute("data-vid"), element)
        element = rnode
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
                updateTree(el, element)
            }
        }
    }
}