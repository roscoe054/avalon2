avalon.directive("repeat", {
    priority: 90,
    init: function (binding) {
        var type = binding.type
        binding.cache = {} //用于存放代理VM

        var elem = binding.element
        if (elem.nodeType === 1) {
            elem.removeAttribute(binding.name)
            binding.sortedCallback = getBindingCallback(elem, "data-with-sorted", binding.vmodels)
            binding.renderedCallback = getBindingCallback(elem, "data-" + type + "-rendered", binding.vmodels)
            var signature = generateID(type)
            var start = DOC.createComment(signature + ":start")
            var end = DOC.createComment(signature + ":end")
            binding.signature = signature
            binding.start = start
            binding.template = avalonFragment.cloneNode(false)
            if (type === "repeat") {
                var parent = elem.parentNode
                parent.replaceChild(end, elem)
                parent.insertBefore(start, end)
                binding.template.appendChild(elem)
            } else {
                while (elem.firstChild) {
                    binding.template.appendChild(elem.firstChild)
                }
                elem.appendChild(start)
                elem.appendChild(end)
            }
            binding.element = end
        }
    },
    update: function (value, oldValue) {
        //console.log(value, oldValue)
        var source = toJson(value) //保存不会被同步的原始数据,防止在内部赋值过程中因ms-duplex被串改
        console.log(source, oldValue)
        var init = !oldValue
        var binding = this
        var elem = this.element
        var now = new Date() - 0
        var parent = elem.parentNode
        var renderKeys = []
        var xtype = avalon.type(value)
        if (xtype !== "array" && xtype !== "object") {
            avalon.log("warning:" + binding.expr + "只能是对象或数组")
            return
        }
        if (xtype === "array") {
            renderKeys = source
        } else {
            for (var key in source) {
                if (value.hasOwnProperty(key) && $$skipArray.indexOf(key) === -1) {
                    renderKeys.push(key)
                }
            }

            if (binding.sortedCallback) { //如果有回调，则让它们排序
                var keys2 = binding.sortedCallback.call(parent, renderKeys)
                if (keys2 && Array.isArray(keys2)) {
                    renderKeys = keys2
                }
            }
        }

        if (init) {
            binding.xtype = xtype
            binding.$outer = {}
            var check0 = "$key"
            var check1 = "$val"
            if (xtype === "array") {
                check0 = "$first"
                check1 = "$last"
            }
            for (var i = 0, v; v = binding.vmodels[i++]; ) {
                if (v.hasOwnProperty(check0) && v.hasOwnProperty(check1)) {
                    binding.$outer = v
                    break
                }
            }
        }
        var retain = avalon.mix({}, binding.cache) //用于判定哪些代理需要保留下来，哪些需要删除

        binding.$repeat = value
        var fragments = []
        var transation = init && avalonFragment.cloneNode(false)
        var length = renderKeys.length
        var itemName = binding.param || "el"
        var proxies = []
        for(var i = 0; i < length; i++) {
            var index = xtype === "object" ? renderKeys[i] : i
            var proxy = retain[index]

            if (!proxy) {
                proxy = binding.cache[index] = getProxyVM(binding) //创建
                shimController(binding, transation, proxy, fragments, init)

                proxy.$active = false
                var hack = proxy[itemName]
                proxy.$active = true
                proxy.$watch(itemName, function (a, b) {
                    binding.$repeat[proxy.$index] = a
                })
            } else {
                fragments.push({})
                retain[index] = true
            }
            //重写proxy
            proxy.$index = i
            proxy.$outer = binding.$outer
            if (xtype === "array") {
                proxy.$first = i === 0
                proxy.$last = i === length - 1
                proxy[itemName] = source[index]
            } else {
                proxy.$key = index
                proxy.$val = source[index]

            }
            proxies.push(proxy)
        }

        this.proxies = proxies

        if (init) {

            parent.insertBefore(transation, elem)
            fragments.forEach(function (fragment) {
                scanNodeArray(fragment.nodes || [], fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            })// jshint ignore:line


        } else {

            //移除节点
            var keys = []
            for (key in retain) {
                if (retain[key] && retain[key] !== true) {
                    avalon.log("delete " + key)
                    removeItem(retain[key].$anchor)
                    // 相当于delete binding.cache[key]
                    proxyRecycler(binding.cache, key)
                    retain[key] = null
                } else {
                    keys.push(key)
                }
            }


            //移动或新增节点
            for (i = 0; i < length; i++) {
                //如果是数组,必须将i转换为字符串,因为上方keys里面从retain取出来的都是字符串
                var cur = xtype === "object" ? renderKeys[i] : i +"" 
                var pre = xtype === "object" ? renderKeys[i - 1] : i - 1
                var old = keys[i]
                var preEl = binding.cache[pre] ? binding.cache[pre].$anchor : binding.start
                var fragment = fragments[i]
                if (!retain[cur]) { //如果还有插入节点，那么将它插入到preEl的后面
                    parent.insertBefore(fragment.content, preEl.nextSibling)
                    fragment.nodes && scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                    console.log("插入")
                } else {
                    if (old !== cur) {

                        var curNode = removeItem(binding.cache[cur].$anchor)
                        parent.insertBefore(curNode, preEl.nextSibling)
                        console.log("移动")
                    } else {
                        //什么也不用做
                    }
                }

            }

        }

        if (parent.oldValue && parent.tagName === "SELECT") { //fix #503
            avalon(parent).val(parent.oldValue.split(","))
        }
        var callback = binding.renderedCallback || noop

        callback.apply(parent, arguments)
        avalon.log("耗时 ", new Date() - now)
    }
})

"with,each".replace(rword, function (name) {
    directives[name] = avalon.mix({}, directives.repeat, {
        priority: 1400
    })
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
    var node = proxy.$anchor || (proxy.$anchor = data.element.cloneNode(false))
    proxy.$watch = proxy.$watch
    node.nodeValue = data.signature
    proxy.$host = data.$repeat
    proxy.$outer = data.$outer
    return proxy
}

var eachProxyPool = []

function eachProxyAgent(data, proxy) {
    var itemName = data.param || "el"
    for (var i = 0, n = eachProxyPool.length; i < n; i++) {
        var candidate = eachProxyPool[i]
        if (candidate && candidate.hasOwnProperty(itemName)) {
            eachProxyPool.splice(i, 1)
            proxy = candidate
        }
    }
    if (!proxy) {
        proxy = eachProxyFactory(itemName)
    }
    proxy.$remove = function () {
        data.$repeat.removeAt(proxy.$index)
    }
    return proxy
}

function eachProxyFactory(itemName) {
    var source = {
        $outer: {},
        $host: [],
        $index: 0,
        $anchor: null,
        //-----
        $first: false,
        $last: false,
        $remove: avalon.noop
    }
    source[itemName] = NaN
//    source[itemName] = {
//        get: function () {
//            var e = this.$events || {}
//            var array = e.$index
//            e.$index = e[itemName] //#817 通过$index为el收集依赖
//            try {
//                return this.$host[this.$index]
//            } finally {
//                e.$index = array
//            }
//        },
//        set: function (val) {
//            try {
//                var e = this.$events || {}
//                console.log(val)
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
        $index: 1
    }
    second[itemName] = 1
    var proxy = modelFactory(source, second)
    proxy.$id = generateID("$proxy$each")

    return proxy
}

var withProxyPool = []

function withProxyAgent() {
    return withProxyPool.pop() || withProxyFactory()
}

function withProxyFactory() {
    var proxy = modelFactory({
        $key: "",
        $val: "",
        $index: 0,
        $outer: {},
        $anchor: null
    }, {
        $key: 1,
        $val: 1,
        $index: 1
    })
    proxy.$id = generateID("$proxy$with")
    return proxy
}


function proxyRecycler(cache, key) {
    var proxy = cache[key]
    if (proxy) {
        var proxyPool = proxy.$id.indexOf("$proxy$each") === 0 ? eachProxyPool : withProxyPool
        proxy.$outer = {}
        if (proxyPool.unshift(proxy) > kernel.maxRepeatSize) {
            proxyPool.pop()
        }
        delete cache[key]
    }
}