bindingHandlers.repeat = function (data, vmodels) {
    var type = data.type
    data.cache = {} //用于存放代理VM
//    var arr = data.value.split(".") || []
//    if (arr.length > 1) {
//        arr.pop()
//        var n = arr[0]
//        for (var i = 0, v; v = vmodels[i++]; ) {
//            if (v && v.hasOwnProperty(n)) {
//                var events = v[n].$events || {}
//                events[subscribers] = events[subscribers] || []
//                events[subscribers].push(data)
//                break
//            }
//        }
//    }

    var elem = data.element
    if (elem.nodeType === 1) {
        elem.removeAttribute(data.name)
        data.sortedCallback = getBindingCallback(elem, "data-with-sorted", vmodels)
        data.renderedCallback = getBindingCallback(elem, "data-" + type + "-rendered", vmodels)
        var signature = generateID(type)
        var start = DOC.createComment(signature + ":start")
        var end = DOC.createComment(signature + ":end")
        data.signature = signature
        data.template = avalonFragment.cloneNode(false)
        if (type === "repeat") {
            var parent = elem.parentNode
            parent.replaceChild(end, elem)
            parent.insertBefore(start, end)
            data.template.appendChild(elem)
        } else {
            while (elem.firstChild) {
                data.template.appendChild(elem.firstChild)
            }
            elem.appendChild(start)
            elem.appendChild(end)
        }
        data.element = end
    }
    parseExprProxy(data.value, vmodels, data)
}
bindingExecutors.repeat = function (value, elem, data) {
    // console.log("========同步视图=============")
    var xtype
    var parent = elem.parentNode
    var renderKeys = []
    if (Array.isArray(value)) {
        xtype = "array"
        renderKeys = value

    } else if (value && typeof value === "object") {
        xtype = "object"
        var keys = Object.keys(value)

        if (data.sortedCallback) { //如果有回调，则让它们排序
            var keys2 = data.sortedCallback.call(parent, keys)
            if (keys2 && Array.isArray(keys2)) {
                renderKeys = keys2
            }
        }
    } else {
        avalon.log("warning:" + data.value + "只能是对象或数组")
        return
    }
    var init = !data.oldValue
    if (init) {
        data.xtype = xtype
        data.$outer = {}
        var check0 = "$key"
        var check1 = "$val"
        if (xtype === "array") {
            check0 = "$first"
            check1 = "$last"
        }
        for (var i = 0, v; v = data.vmodels[i++]; ) {
            if (v.hasOwnProperty(check0) && v.hasOwnProperty(check1)) {
                data.$outer = v
                break
            }
        }
    }
    var retain = avalon.mix({}, data.cache)//用于判定哪些代理需要保留下来，哪些需要删除

    data.$repeat = value
    var fragments = []
    var transation = avalonFragment.cloneNode(false)
    var length = renderKeys.length
    var itemName = data.param || "el"
    for (var i = 0; i < length; i++) {
        var index = xtype === "object" ? renderKeys[i] : i
        var proxy = retain[index]
        if (!proxy) {
            proxy = data.cache[index] = getProxyVM(data)//创建
            shimController(data, transation, proxy, fragments, init)
        } else {
            fragments.push({})
            retain[index] = true
        }
        //重写proxy
        proxy.$index = i
        proxy.$outer = data.$outer
        if (xtype == "array") {
            proxy.$first = i === 0
            proxy.$last = i === length - 1
            proxy[itemName] = value[index]

            proxy.$remove = function () {
                return value.removeAt(proxy.$index)
            }
        } else {
            proxy.$key = index
            proxy.$val = i === length - 1
        }
    }
    if (init) {
        parent.insertBefore(transation, elem)

        fragments.forEach(function (fragment) {
            scanNodeArray(fragment.nodes, fragment.vmodels)
            fragment.nodes = fragment.vmodels = null
        })


    } else {
        //移除没用的
        var keys = []
        for (var key in retain) {
            if (retain[key] && retain[key] !== true) {
                removeItem(retain[key].$anchor)
                delete data.cache[key]  //这里应该回收代理VM
            } else {
                keys.push(key)
            }
            retain[key] = null
        }
        //处理移动与新增节点

        for (i = 0; i < renderKeys.length; i++) {
            var cur = xtype === "object" ? renderKeys[i] : i
            var old = keys[i]
            if (old === cur) {
                console.log(old, cur, "一样")
            } else if (old === void 0) {
                var fragment = fragments[i]
                parent.insertBefore(fragment.content, elem)
                scanNodeArray(fragment.nodes, fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            }
        }

    }

}

"with,each".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.repeat
})

function removeItem(node) {
    var self = node
    var parent = node.parentNode
    while (node = node.nextSibling) {
        if ((node.nodeValue || "").indexOf(self.nodeValue) === 0) {
            break
        }
        parent.removeChild(node)
    }
    parent.removeChild(self)
}

function shimController(data, transation, proxy, fragments, init) {
    var content = data.template.cloneNode(true)
    var nodes = avalon.slice(content.childNodes)
    content.insertBefore(proxy.$anchor, content.firstChild)
    init && transation.appendChild(content)
    var nv = [proxy].concat(data.vmodels)
    var fragment = {
        nodes: nodes,
        vmodels: nv,
        content: content
    }
    fragments.push(fragment)
}


function getProxyVM(data) {
    var factory = data.xtype === "object" ? withProxyAgent : eachProxyAgent
    var proxy = factory(data)
    var node = proxy.$anchor = proxy.$anchor || data.element.cloneNode(false)
    node.nodeValue = data.signature
    proxy.$outer = data.$outer
    return proxy
}

var eachProxyPool = []
function eachProxyAgent(data) {
    var itemName = data.param || "el"
    for (var i = 0, n = eachProxyPool.length; i < n; i++) {
        var candidate = eachProxyPool[i]
        if (candidate && candidate.hasOwnProperty(itemName)) {
            eachProxyPool.splice(i, 1)
            return candidate
        }
    }
    return eachProxyFactory(itemName)
}
function eachProxyFactory(itemName) {
    var source = {
        $outer: {},
        $index: 0,
        $anchor: {},
        //-----
        $first: false,
        $last: false,
        $remove: avalon.noop
    }
    source[itemName] = NaN
    var second = {
        $last: 1,
        $first: 1,
        $index: 1
    }
    second[itemName] = 1
    var proxy = modelFactory(source, second)
    proxy.$id = generateID("$proxy$each")
    return proxy
}

var withProxyPool = []
function withProxyAgent() {
    return  withProxyPool.pop() || withProxyFactory()
}

function withProxyFactory() {
    var proxy = modelFactory({
        $key: "",
        $val: "",
        $index: 0,
        $outer: {},
        $anchor: {}
    }, {
        $key: 1,
        $val: 1,
        $index: 1
    })
    proxy.$id = generateID("$proxy$with")
    return proxy
}