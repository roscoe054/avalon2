function VElement(element, parentNode) {
    this.nodeType = 1
    var vid = getUid(element)
    this.vid = element.vid = vid
    this.nodeName = element.nodeName
    this.className = element.className
    this.attributes = []
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
                        ret.attributes.push({
                            name: attr.name,
                            value: attr.value
                        })
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
    textFilter: function (vnode, rnode) {
        var rnodes = rnode.childNodes
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
                                rnode.insertBefore(neo, rnodes[i])
                            } else {
                                rnode.appendChild(neo)
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
    css: function (vnode, rnode) {
        for (var i in vnode.style) {
            if (rnode.style[i] !== vnode.style[i]) {
                avalon(rnode).css(i, vnode.style[i])
            }
        }
        vnode.style = {}
    },
    text: function (vnode, rnode) {
        var newValue = vnode.childNodes[0].nodeValue || ""
        var oldValue = rnode[textContent]
        if (oldValue !== newValue) {
            log("更新ms-text")
            rnode[textContent] = newValue
        }
    },
    html: function () {
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
    addTask: function (name) {
        var task = VTasks[name]
        if (task) {
            this.dirty = true
            avalon.Array.ensure(this.tasks, task)
            globalRender()
        }
    },
    insertBefore: function (node, before) {//node可以是元素节点,文档碎片或数组
        var nodes = node.nodeType === 11 ? node.childNodes : Array.isArray(node) ? node : [node]
        var index = this.childNodes.indexOf(before)
        if (index === -1) {
            this.appendChild(nodes)
        } else {
            this.replaceChild(node, before, true)
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
        var attrs = this.attributes
        for (var i = 0, attr; attr = attrs[i++]; ) {
            if (attr.name === name)
                return attr.value
        }
    },
    hasAttribute: function (name) {
        var value = this.getAttribute(el, name)
        return typeof value === "string"
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
    setStyle: function (name, value) {
        var style = this.style || (this.style = {})
        style[camelize(name)] = value
    },
    setAttribute: function (name, value) {
        // zilong@2015-5-15: 在parse5序列化dom的attribute时，对于tabindex、colspan这类数字类型的属性，如果不转换为字符串，程序会崩溃
        if (typeof value !== 'string') {
            value = String(1);
        }
        var attrs = this.attributes
        for (var i = 0, attr; attr = attrs[i++]; ) {
            if (attr.name === name) {
                attr.value = value
                return this
            }
        }
        attrs.push({
            name: name,
            value: value
        })
        return this
    },
    removeAttribute: function (name) {
        var attrs = this.attributes
        for (var i = attrs.length, attr; attr = attrs[--i]; ) {
            if (attr.name === name) {
                attrs.splice(i, 1)
                break
            }
        }
        return this
    },
    setBoolAttribute: function (name, value) {
        if (value) {
            this.setAttribute(name, name)
        } else {
            this.removeAttribute(name)
        }
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