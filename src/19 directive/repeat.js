bindingHandlers.repeat = function (data, vmodels) {
    var type = data.type
    data.cache = {} //用于存放代理VM
    var arr = data.value.split(".") || []
    if (arr.length > 1) {
        arr.pop()
        var n = arr[0]
        for (var i = 0, v; v = vmodels[i++]; ) {
            if (v && v.hasOwnProperty(n)) {
                var events = v[n].$events || {}
                events[subscribers] = events[subscribers] || []
                events[subscribers].push(data)
                break
            }
        }
    }

    var elem = data.element
    if (elem.nodeType === 1) {
        elem.removeAttribute(data.name)
        data.sortedCallback = getBindingCallback(elem, "data-with-sorted", vmodels)
        data.renderedCallback = getBindingCallback(elem, "data-" + type + "-rendered", vmodels)
        var signature = generateID(type)
        var start = DOC.createComment(signature)
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
    }

    var retain = avalon.mix({}, data.cache)//用于判定哪些代理需要保留下来，哪些需要删除
    data.xtype = xtype
    var init = !data.oldValue

    data.$repeat = value
    var fragments = []
    var transation = avalonFragment.cloneNode(false)
    for (var i = 0; i < renderKeys.length; i++) {
        var index = xtype === "object" ? renderKeys[i] : i
        var proxy = retain[index]
        if (!proxy) {
            proxy = data.cache[index] = eachProxyAgent(i, data)//创建
            shimController(data, transation, proxy, fragments, init)
        } else {
            if (value[index] != index) {
                data.cache[index][data.param || "el"] = value[index]
            }
            retain[index] = true
        }
        //如果数组的元素值发生变化, proxy.el也应该发生变化
    }
    if (init) {
        var now = new Date() - 0, fragment
        avalon.optimize = avalon.optimize || now
        for (i = 0; fragment = fragments[i++]; ) {
            scanNodeArray(fragment.nodes, fragment.vmodels)
            fragment.nodes = fragment.vmodels = null
        }
        if (avalon.optimize === now) {
            avalon.optimize = null
        }
        parent.insertBefore(transation, elem)
        avalon.profile("插入操作花费了 " + (new Date - now))
    } else {
        //移除没用的
        for (var key in retain) {
            if (retain[key] !== true) {
                // console.log( data.cache[key])
                console.log(retain[key].$node)
                removeItem(retain[key].$node)
                data.cache[key] = null

            }
            retain[key] = null
        }
         //处理移动与新增节点


    }





}

"with,each".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.repeat
})

function removeItem(node) {
    var self = node
    var parent = node.parentNode
    while (node = node.nextSibling ) {
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
    content.insertBefore(proxy.$node, content.firstChild)
    init && transation.appendChild(content)
    var nv = [proxy].concat(data.vmodels)
    var fragment = {
        nodes: nodes,
        vmodels: nv
    }
    fragments.push(fragment)
}

function getComments(data) {
    var ret = []
    var nodes = data.element.parentNode.childNodes
    for (var i = 0, node; node = nodes[i++]; ) {
        if (node.nodeValue === data.signature) {
            ret.push(node)
        } else if (node.nodeValue === data.signature + ":end") {
            break
        }
    }
    return ret
}


//移除掉start与end之间的节点(保留end)
function sweepNodes(start, end, callback) {
    while (true) {
        var node = end.previousSibling
        if (!node)
            break
        node.parentNode.removeChild(node)
        callback && callback.call(node)
        if (node === start) {
            break
        }
    }
}

// 为ms-each,ms-with, ms-repeat会创建一个代理VM，
// 通过它们保持一个下上文，让用户能调用$index,$first,$last,$remove,$key,$val,$outer等属性与方法
// 所有代理VM的产生,消费,收集,存放通过xxxProxyFactory,xxxProxyAgent, recycleProxies,xxxProxyPool实现
var withProxyPool = []
function withProxyFactory() {
    var proxy = modelFactory({
        $key: "",
        $outer: {},
        $host: {},
        $val: {
            get: function () {
                return this.$host[this.$key]
            },
            set: function (val) {
                this.$host[this.$key] = val
            }
        }
    }, {
        $val: 1
    })
    proxy.$id = generateID("$proxy$with")
    return proxy
}

function withProxyAgent(proxy, key, data) {
    proxy = proxy || withProxyPool.pop()
    if (!proxy) {
        proxy = withProxyFactory()
    } else {
        proxy.$reinitialize()
    }
    var host = data.$repeat
    proxy.$key = key
    proxy.$host = host
    proxy.$outer = data.$outer

    if (host.$events) {
        proxy.$events.$val = host.$events[key]
    } else {
        proxy.$events = {}
    }
    return proxy
}


function  recycleProxies(proxies) {
    eachProxyRecycler(proxies)
}
function eachProxyRecycler(proxies) {
    proxies.forEach(function (proxy) {
        proxyRecycler(proxy, eachProxyPool)
    })
    proxies.length = 0
}


var eachProxyPool = []
function eachProxyFactory(name) {
    var source = {
        $host: [],
        $outer: {},
        $index: 0,
        $first: false,
        $last: false,
        $remove: avalon.noop,
        $node: {}
    }
    source[name] = NaN
//    source[name] = {
//        get: function () {
//            var e = this.$events || {}
//            var array = e.$index
//            e.$index = e[name] //#817 通过$index为el收集依赖
//            try {
//                return this.$host[this.$index]
//            } finally {
//                e.$index = array
//            }
//        },
//        set: function (val) {
//            try {
//                var e = this.$events || {}
//                var array = e.$index
//             
//                e.$index = []
//                this.$host.set(this.$index, val)
//            } finally {
//                e.$index = array
//            }
//        }
//    }
    var second = {
        $last: 1,
        $first: 1,
        $index: 1,
    }
    second[name] = 1
    var proxy = modelFactory(source, second)
    proxy.$id = generateID("$proxy$each")
    return proxy
}

function eachProxyAgent(index, data) {
    var param = data.param || "el",
            proxy
    for (var i = 0, n = eachProxyPool.length; i < n; i++) {
        var candidate = eachProxyPool[i]
        if (candidate && candidate.hasOwnProperty(param)) {
            proxy = candidate
            eachProxyPool.splice(i, 1)
        }
    }
    if (!proxy) {
        proxy = eachProxyFactory(param)
    }
    var host = data.$repeat

    var last = host.length - 1
    proxy.$index = index
    proxy.$first = index === 0
    proxy.$last = index === last
    proxy.$host = host
    proxy[param] = host[index]
    proxy.$outer = data.$outer
    var node = proxy.$node = data.element.cloneNode(true)
    node.nodeValue = node.nodeValue.replace(":end", "")
    proxy.$remove = function () {
        return host.removeAt(proxy.$index)
    }
    return proxy
}


function proxyRecycler(proxy, proxyPool) {
    for (var i in proxy.$events) {
        if (Array.isArray(proxy.$events[i])) {
            proxy.$events[i].forEach(function (data) {
                if (typeof data === "object")
                    disposeData(data)
            })// jshint ignore:line
            proxy.$events[i].length = 0
        }
    }
    proxy.$host = proxy.$outer = {}
    if (proxyPool.unshift(proxy) > kernel.maxRepeatSize) {
        proxyPool.pop()
    }
}