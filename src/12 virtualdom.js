function VElement(element, parentNode) {
    this.nodeType = 1

    this.vid = getUid(element)
    this.nodeName = element.nodeName
    this.className = element.className
    this.childNodes = []
    this.style = {}
    this.tasks = []
    this.props = {}
    this.parentNode = parentNode
    this.innerHTML = "<ms ms-if=bbb>"
    this.textContent = ""
    // this.dirty
    var fix = VElements[this.nodeName.toLowerCase()]
    if (typeof fix === "function") {
        fix(this)
    }
    this.isVirtual = true //直接判定有没有queryVID方法就行了
    try {
        if (parentNode) {
            parentNode.appendChild(this)
        }
    } catch (e) {
        log(e)
    }
}
var VElements = {
    input: function (elem) {
        elem.type = elem.props.type || "text"
    },
    button: function (elem) {
        elem.type = elem.props.type || "submit"
    },
    select: function (elem) {
        elem.type = elem.props.multiple ? "select-multiple" : "select-one"
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

VElement.prototype = {
    constructor: VElement,
    addTask: function (name, elem) {//通过一个个刷新任务同步到真正的DOM树上
        var task = updateDTree[name]
        if (task) {
            this.dirty = true
            avalon.Array.ensure(this.tasks, task)
            globalRender(elem)
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
            ap.splice.apply(this.childNodes, args)
        }
        return nodes
    },
    replaceChild: function (node, replaced) {//node可以是元素节点,文档碎片或数组
        var nodes = node.nodeType === 11 ? node.childNodes : Array.isArray(node) ? node : [node]
        var children = this.childNodes
        var index = children.indexOf(replaced)
        if (index === -1)
            return null
        var args = [index, 1]
        for (var i = 0, el; el = nodes[i++]; ) {
            el.parentNode = this
            args.push(el)
        }
        Array.prototype.splice.apply(children, args)
        replaced.parentNode = null
        return replaced
    },
    removeChild: function (elem) {
        var children = this.childNodes
        var index = children.indexOf(elem)
        if (~index)
            children.splice(index, 1)
        elem.parentNode = null
        return elem
    },
    getAttribute: function (name) {
        return this.props[name]
    },
    hasAttribute: function (name) {
        return typeof this.props[name] === "string"
    },
    setAttribute: function (name, value) {
        this.props[name] = String(value)
        return this
    },
    removeAttribute: function (name) {
        this.props[name] = void 0
        return this
    },
    getValue: function () {
        var blank = ""
        var value = this.getAttribute("value")
        switch (this.nodeName) {
            case "TEXTAREA":
                return  getText(this)
            case "OPTION":
                return typeof value === "string" ? value : getText(this)
            case "SELECT":
            case "INPUT":
            case "BUTTON":
                return value || blank
        }
        return value
    }
}
function getText(elem) {
    var ret = ""
    var children = elem.childNodes
    for (var i = 0, el; el = children[i++]; ) {
        ret += el.nodeValue
    }
    return ret
}
function VComment(nodeValue) {
    this.nodeType = 8
    this.nodeName = "#comment"
    this.isVirtual = true
    this.nodeValue = nodeValue + ""
}

function VText(nodeValue) {
    this.nodeType = 3
    this.nodeName = "#text"
    this.isVirtual = true
    this.nodeValue = nodeValue + ""
}

function VDocumentFragment() {
    this.nodeType = 11
    this.isVirtual = true
    this.nodeName = "#document-fragment"
    this.childNodes = []
}

VDocumentFragment.prototype = {
    constructor: VDocumentFragment
}

String("appendChild, removeChild,insertBefore,replaceChild").replace(/\w+/g, function (method) {
    VDocumentFragment.prototype[method] = VElement.prototype[method]
})


