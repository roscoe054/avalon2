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
        data.start = start
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
    var now = new Date -0
    var xtype
    var parent = elem.parentNode
    var renderKeys = []
    if (Array.isArray(value)) {
        xtype = "array"
        renderKeys = value

    } else if (value && typeof value === "object") {
        xtype = "object"
    //    renderKeys = value
        for (var key in value) {
            if (value.hasOwnProperty(key) && $$skipArray.indexOf(key) == -1) {
                renderKeys.push(key)
            }
        }

        if (data.sortedCallback) { //如果有回调，则让它们排序
            var keys2 = data.sortedCallback.call(parent, renderKeys)
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
    var transation = init && avalonFragment.cloneNode(false)
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
            proxy.$val = value[index]
        }
    }
    if (init) {
        
        parent.insertBefore(transation, elem)
        fragments.forEach(function (fragment) {
            scanNodeArray(fragment.nodes, fragment.vmodels)
            fragment.nodes = fragment.vmodels = null
        })

    } else {
        //移除节点
        var keys = []
        for (var key in retain) {
            if (retain[key] && retain[key] !== true) {
                removeItem(retain[key].$anchor)
                delete data.cache[key]  //这里应该回收代理VM
                retain[key] = null
            } else {
                keys.push(key)
            }
        }
        //移动或新增节点
        for (i = 0; i < length; i++) {
            var cur = xtype === "object" ? renderKeys[i] : i
            var pre = xtype === "object" ? renderKeys[i - 1] : i - 1
            var old = keys[i]
            var preEl = data.cache[pre] ? data.cache[pre].$anchor : data.start
            var fragment = fragments[i]
            if (!retain[cur]) {//如果还有插入节点，那么将它插入到preEl的后面
                parent.insertBefore(fragment.content, preEl.nextSibling)
                scanNodeArray(fragment.nodes, fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            } else {
                if (old !== cur) {
                    var curNode = removeItem(data.cache[cur].$anchor)
                    parent.insertBefore(curNode, preEl.nextSibling)
                } else {
                    //什么也不用做
                }
            }

        }

    }
    avalon.log("耗时 ",new Date - now)
}

"with,each".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.repeat
})


function removeItem(node) {
    var fragment = avalonFragment.cloneNode(false)
    var self = node
    while (node = node.previousSibling) {
        if ((node.nodeValue || "").indexOf(self.nodeValue) === 0) {
            break
        }
        fragment.insertBefore(node, fragment.firstChild)

    }
    fragment.appendChild(self)
    return fragment
}

function shimController(data, transation, proxy, fragments, init) {
    var content = data.template.cloneNode(true)
    var nodes = avalon.slice(content.childNodes)
    content.appendChild(proxy.$anchor)
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