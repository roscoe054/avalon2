function VElement(element, parentNode) {
    this.nodeType = 1
    var vid = getUid(element)
    this.vid = element.vid = vid
    this.nodeName = element.nodeName
    this.className = element.className
    this.attributes = []
    this.childNodes = []
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
    // this.diffText
    // this.diffAttr
    // this.diffNode
    // this.diffStyle
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
    this.nodeValue = nodeValue
}

function VText(nodeValue) {
    this.nodeType = 3
    this.nodeName = "#text"
    this.nodeValue = nodeValue
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
    var diff = node.diffText || node.diffAttr || node.diffStyle
    if (diff) {
        var rnode = querySelector(node.nodeName, node.vid)
        if (!rnode)
            return
        if (node.diffText) {
            //    console.log("更新{{}}")
            var rnodes = rnode.childNodes
            var vnodes = node.childNodes, vnode
            for (var i = 0, el; el = rnodes[i]; i++) {
                vnode = vnodes[i]
                if (el.nodeType === 3 && vnode.nodeType === 3 && el.nodeValue !== vnode.nodeValue) {
                    el.nodeValue = vnode.nodeValue
                }
            }
        }
    }
    if (node.childNodes && node.childNodes.length) {
        for (var i = 0, el; el = node.childNodes[i++]; ) {
            if (el.nodeType === 1) {
                updateTree(el)
            }
        }
    }
}
function createVChild(realNode) {
    var array = []
    for (var i = 0, el; el = realNode.childNodes[i++]; ) {
        switch (el.nodeType) {
            case 1:
                array.push(new VElement(el))
                break
            case 3:
                array.push(new VText(el.nodeValue))
                break
            case 8:
                array.push(new VComment(el.nodeValue))
                break
        }
    }
    return array
}

function getTextOrder(node, parent, el) {
    for (var i = 0; el = parent.childNodes[i]; i++) {
        if (node === el)
            return i
    }
    return -1
}