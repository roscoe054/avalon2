function VElement(element, parentNode) {
    this.nodeType = 1
    var vid = getUid(element)
    this.vid = element.vid = vid
    this.nodeName = element.nodeName
    this.className = element.className
    this.childNodes = []
    this.style = {}
    this.tasks = []
    this.props = {}
    this.parentNode = parentNode
    //   this.isVirtualdom = true 直接判定有没有queryVID方法就行了
    try {
        if (parentNode) {
            parentNode.appendChild(this)
        }
    } catch (e) {
        log(e)
    }
// this.style = {}
// this.dirty

}


function addVnodeToData(elem, data) {
    if (data.vnode) {
        return data.vnode
    } else if (elem.nodeType === 1) {
        var vid = getUid(elem)
        var vnode = VTree.queryVID(vid)
        if (!vnode) {
            vnode = new VElement(elem, VTree)
        }
        return data.vnode = vnode
    }
//    else {
//        var vid = elem.vid || getUid(elem.parentNode)
//        var vparent = VTree.queryVID(vid)
//        var index = getTextOrder(elem, elem.parentNode)
//        return data.vnode = vparent.childNodes[index]
//    }
}
//将一组节点转换为虚拟DOM
function VNodes(nodes) {
    var ret = []
    for (var i = 0, n = nodes.length; i < n; i++) {
        ret.push(new VNode(nodes[i], false))
    }
    return ret
}
function VNode(element, deep) {
    var ret
    switch (element.nodeType) {
        case 11:
            ret = new VDocumentFragment()
            deep && ap.forEach.call(element.childNodes, function (node) {//添加属性
                var vnode = new VNode(node)
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
                    var vnode = new VNode(node)
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
//属性,类名,样式,子节点
function forEachElements(dom, callback) {
    for (var i = 0, el; el = dom.childNodes[i++]; ) {
        if (el.nodeType === 1) {
            if (callback(el) === false) {
                break
            } else {
                forEachElements(el, callback)
            }
        }
    }
}
VTasks = {
    textFilter: function (vnode, elem) {
        var rnodes = elem.childNodes
        var vnodes = vnode.childNodes
        var skip = false
        for (var i = 0, node; node = vnodes[i]; i++) {
            node = vnodes[i]
            if (node.nodeType !== 1) {//跳过所有元素节点
                if (skip) {
                    if (isFlag(vnode))
                        skip = false
                } else {
                    if (isFlag(vnode)) {
                        skip = true
                    } else {

                        if (rnodes[i] && rnodes[i].nodeType === 3) {
                            rnodes[i].nodeValue = node.nodeValue
                        } else {
                            var neo = DOC.createTextNode(node.nodeValue)
                            if (rnodes[i]) {
                                elem.insertBefore(neo, rnodes[i])
                            } else {
                                elem.appendChild(neo)
                            }
                        }
                    }
                }
            }
        }
    },
    htmlFilter: function () {
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

    },
    html: function (vnode, elem) {
        if (!elem)
            return
        var data = vnode.htmlData
        var val = vnode.htmlValue
        //转换成文档碎片
        if (typeof val !== "object") {//string, number, boolean
            var fragment = avalon.parseHTML(String(val))
        } else if (val.nodeType === 11) { //将val转换为文档碎片
            fragment = val
        } else if (val.nodeType === 1 || val.item) {
            var nodes = val.nodeType === 1 ? val.childNodes : val.item
            fragment = hyperspace.cloneNode(true)
            while (nodes[0]) {
                fragment.appendChild(nodes[0])
            }
        }
        nodes = avalon.slice(fragment.childNodes)

        var comments = []
        for (var i = 0, el; el = elem.childNodes[i++]; ) {
            if (el.nodeType === 8 && el.nodeValue.indexOf(data.signature) === 0) {
                comments.push(el)
            }
        }
        //移除两个注释节点间的节点
        while (true) {
            var node = comments[1].previousSibling
            if (!node || node === comments[0]) {
                break
            } else {
                elem.removeChild(node)
            }
        }
        elem.insertBefore(fragment, comments[1])
        scanNodeArray(nodes, data.vmodels)
        delete vnode.htmlData
        delete vnode.htmlValue
    },
    css: function (vnode, elem) {
        for (var i in vnode.style) {
            if (elem.style[i] !== vnode.style[i]) {
                avalon(elem).css(i, vnode.style[i])
            }
        }
        vnode.style = {}
    },
    text: function (vnode, elem) {
        var data = vnode.textData
        if (!vnode.childNodes.length) {


            var array = VNodes(elem.childNodes)
            vnode.appendChild(array)
        } else {
            array = VNodes(elem.childNodes)
            array = collectTextNode(array, vnode.childNodes)
            vnode.childNodes.length = 0
            vnode.appendChild(array)

        }
        //收集两个注释节点间的文本节点
        function collectTextNode(aaa, bbb) {//aaa为新的， bbb为旧的
            var k = false
            var array = []
            while (aaa.length) {
                var neo = aaa.shift()
                array.push(neo)
                if (neo.nodeType === 8 && /^v-\w+\d+/.test(neo.nodeValue)) {
                    k = !k
                    if (k) {
                        var arr = getSignature(bbb, neo.nodeValue)
                        array = array.concat(arr)
                    }
                } else {
                    if (k) {
                        array.pop()
                    }
                }

            }
            return array
        }

        fillSignatures(vnode, data, new VText(vnode.textValue))

        //  console.log(elem)
        //      elem = data.element

//        var newValue = vnode.childNodes[0].nodeValue || ""
//        var oldValue = elem[textContent]
//        if (oldValue !== newValue) {
//            log("更新ms-text")
//            elem[textContent] = newValue
//        }
    },
    "if": function (vnode, elem) {
        var data = vnode.ifData
        elem = data.element
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
    }
}
var textContent = "textContent" in root ? "textContent" : "innerText"
var rcommentmask = /^(\d+)\w+\1+/
//两个注释点的节点当作一个独立的单元
function isFlag(node) {
    return node.nodeType === 8 && rcommentmask.test(node.nodeValue)
}
VElement.prototype = {
    constructor: VElement,
    addTask: function (name) {//通过一个个刷新任务同步到真正的DOM树上
        var task = VTasks[name]
        if (task) {
            this.dirty = true
            avalon.Array.ensure(this.tasks, task)
            globalRender()
        }
    },
    queryVID: function (vid) {
        var ret = null
        forEachElements(this, function (el) {
            if (el.vid === vid) {
                ret = el
                return false
            }
        })
        return ret
    },
    queryTag: function (tagName) {
        var ret = []
        forEachElements(this, function (el) {
            if (el.tagName === tagName) {
                ret.push(el)
            }
        })
        return ret
    },
    queryClass: function (className) {
        var pattern = new RegExp("(^|\\s)" + className + "(\\s|$)")
        var ret = []
        forEachElements(this, function (el) {
            if (pattern.test(el.className)) {
                ret.push(el)
            }
        })
        return ret
    },
    appendChild: function (node) {//node可以是元素节点,文档碎片或数组
        var nodes = node.nodeType === 11 ? node.childNodes : Array.isArray(node) ? node : [node]
        for (var i = 0, node; node = nodes[i++]; ) {
            node.parentNode = this
            this.childNodes.push(node)
        }
        return nodes
    },
    insertBefore: function (node, before) {//node可以是元素节点,文档碎片或数组
        var nodes = node.nodeType === 11 ? node.childNodes : Array.isArray(node) ? node : [node]
        var index = this.childNodes.indexOf(before)
        if (index === -1) {
            this.appendChild(nodes)
        } else {
            nodes.forEach(function (child) {
                child.parentNode = before.parentNode
            })
            var args = [index, 0].concat(nodes)
            //  console.log(index, this.childNodes.length, nodes.length)
            ap.splice.apply(this.childNodes, args)
            //   console.log(this.childNodes.length)
        }
        return nodes
    },
    replaceChild: function (node, replaced, keepReplaced) {//node可以是元素节点,文档碎片或数组
        var nodes = node.nodeType === 11 ? node.childNodes : Array.isArray(node) ? node : [node]
        var children = this.childNodes
        var index = children.indexOf(replaced)
        if (index === -1)
            return null
        var args = keepReplaced ? [index, 0, replaced] : [index, 1]
        for (var i = 0, el; el = nodes[i++]; ) {
            el.parentNode = this
            args.push(el)
        }
        Array.prototype.splice.apply(children, args)

        return replaced
    },
    removeChild: function (elem) {
        var children = this.childNodes
        var index = children.indexOf(elem)
        if (~index)
            children.splice(index, 1)
        return elem
    },
    getAttribute: function (name) {
        return this.props[name]
    },
    hasAttribute: function (name) {
        return typeof this.props[name] === "string"
    },
    getText: function () {
        var ret = ""
        var children = this.childNodes
        for (var i = 0, el; el = children[i++]; ) {
            ret += el.nodeValue
        }
        return ret
    },
    setText: function (str) {
        var node = new VText(str)
        this.childNodes.length = 0
        this.appendChild(node)
    },
    getValue: function () {
        var blank = ""
        var value = this.getAttribute("value")
        switch (this.nodeName) {
            case "TEXTAREA":
                return this.getText()
            case "OPTION":
                return typeof value === "string" ? value : this.getText()
            case "SELECT":
            case "INPUT":
            case "BUTTON":
                return value || blank
        }
        return value
    },
    setAttribute: function (name, value) {
        this.props[name] = String(value)
        return this
    },
    removeAttribute: function (name) {
        this.props[name] = void 0
        return this
    },
    setBoolAttribute: function (name, value) {
        this.props[name] = !!value
    }
}

function VComment(nodeValue) {
    this.nodeType = 8
    this.nodeName = "#comment"
    this.nodeValue = nodeValue + ""
}

function VText(nodeValue) {
    this.nodeType = 3
    this.nodeName = "#text"
    this.nodeValue = nodeValue + ""
}

function VDocumentFragment() {
    this.nodeType = 11
    this.nodeName = "#document-fragment"
    this.childNodes = []
}

VDocumentFragment.prototype = {
    constructor: VDocumentFragment
}

String("appendChild, removeChild,insertBefore,replaceChild").replace(/\w+/g, function (method) {
    VDocumentFragment.prototype[method] = VElement.prototype[method]
})
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
    console.log("更新视图")
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


function getTextOrder(node, parent, el) {
    for (var i = 0; el = parent.childNodes[i]; i++) {
        if (node === el)
            return i
    }
    return -1
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
    var start = DOC.createComment(data.signature)
    var end = DOC.createComment(data.signature + ":end")
    var parent = elem.parentNode
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
        console.log(data.signature + "!找不到元素")
        return
    }
    var index = indexElement(comments[0], elem.childNodes)

    while (true) {
        var node = elem.childNodes[index + 1]
        if (node && node !== comments[1]) {
            elem.removeChild(node)
            callback(node, comments[0], comments[1])
        } else {
            break
        }
    }
    console.log(elem.childNodes.length, comments[1], "c")
    elem.insertBefore(fill, comments[1])
}
function indexElement(target, array) {
    for (var i = 0, el; el = array[i]; i++) {
        if (el === target)
            return i
    }
    return -1
}
