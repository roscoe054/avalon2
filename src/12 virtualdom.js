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
    // this.dirty
    var fix = VElements[this.nodeName.toLowerCase()]
    if (typeof fix === "function") {
        fix(this)
    }
    //   this.isVirtualdom = true 直接判定有没有queryVID方法就行了
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


//将一组节点转换为虚拟DOM
function VNodes(nodes) {
    var ret = []
    for (var i = 0, n = nodes.length; i < n; i++) {
        ret.push(new VNode(nodes[i], false))
    }
    return ret
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
    } else if (elem.queryVID) {
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
