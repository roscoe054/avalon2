avalon.directive("repeat", {
    priority: 90,
    init: function (binding) {
        var type = binding.type
        binding.cache = {} //用于存放代理VM
        var arr = binding.expr.split(".") || []
        if (arr.length > 1) {
            arr.pop()
            var n = arr[0]
            for (var i = 0, v; v = binding.vmodels[i++]; ) {
                if (v && v.hasOwnProperty(n)) {
                    var events = v[n].$events || {}
                    events[subscribers] = events[subscribers] || []
                    avalon.Array.ensure(events[subscribers], binding)
                    break
                }
            }
        }
        var elem = binding.element
        if (elem.nodeType === 1) {
            elem.removeAttribute(binding.name)
            binding.param = binding.param || "el"
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
        var binding = this
        var xtype = this.xtype
        this.updating = true
        var init = !oldValue
        var now = new Date()
        if (init) {
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
        var track = this.track
        if (binding.sortedCallback) { //如果有回调，则让它们排序
            var keys2 = binding.sortedCallback.call(parent, track)
            if (keys2 && Array.isArray(keys2)) {
                track = keys2
            }
        }
        binding.$repeat = value
        var fragments = []
        var transation = init && avalonFragment.cloneNode(false)
        var proxies = []
        var param = this.param
        var retain = avalon.mix({}, this.cache)
        var elem = this.element
        var length = track.length
        var source = toJson(value)
        var parent = elem.parentNode
        
        for (i = 0; i < length; i++) {
            var keyOrId = track[i] //array为随机数, object 为keyName
            var proxy = retain[keyOrId]
            if (!proxy) {
                proxy = getProxyVM(this)
                if (xtype === "array") {
                    proxy.$id = keyOrId
                    proxy[param] = source[i] //index
                } else {
                    proxy.$key = keyOrId
                    proxy.$val = source[keyOrId]
                }
                this.cache[keyOrId] = proxy
                var node = proxy.$anchor || (proxy.$anchor = elem.cloneNode(false))
                node.nodeValue = this.signature
                shimController(binding, transation, proxy, fragments, init)
                decorateProxy(proxy, binding, xtype)
            } else {
                fragments.push({})
                retain[keyOrId] = true
            }
            //重写proxy
            proxy.$active = false
            proxy.$oldIndex = proxy.$index
            proxy.$active = true
            proxy.$index = i
            if (xtype === "array") {
                proxy.$first = i === 0
                proxy.$last = i === length - 1
            }
            proxies.push(proxy)
        }
        this.$proxy = proxies
        if (init) {

            parent.insertBefore(transation, elem)
            fragments.forEach(function (fragment) {
                scanNodeArray(fragment.nodes, fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            })// jshint ignore:line
        } else {
            for (keyOrId in retain) {
                if (retain[keyOrId] !== true) {
                    removeItem(retain[keyOrId].$anchor, "remove")
                    // avalon.log("删除", keyOrId)
                    // 相当于delete binding.cache[key]
                    proxyRecycler(binding.cache, keyOrId)
                    retain[keyOrId] = null
                }
            }
            for (i = 0; i < length; i++) {
                proxy = proxies[i]
                keyOrId = xtype === "array" ? proxy.$id : proxy.$key
                var pre = proxies[i - 1]
                var preEl = pre ? pre.$anchor : binding.start
                if (!retain[keyOrId]) {//如果还没有插入到DOM树
                    var fragment = fragments[i]

                    parent.insertBefore(fragment.content, preEl.nextSibling)
                    scanNodeArray(fragment.nodes || [], fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                    // avalon.log("插入")

                } else if (proxy.$index !== proxy.$oldIndex) {
                    var curNode = removeItem(proxy.$anchor)// 如果位置被挪动了
                    parent.insertBefore(curNode, preEl.nextSibling)
                    // avalon.log("移动", proxy.$oldIndex, "-->", proxy.$index)
                }
            }


        }

        if (parent.oldValue && parent.tagName === "SELECT") { //fix #503
            avalon(parent).val(parent.oldValue.split(","))
        }
        var callback = binding.renderedCallback || noop
        this.updating = false
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
    var breakText = node.nodeValue
    while (true) {
        var pre = node.previousSibling
        if (String(pre.nodeValue).indexOf(breakText) === 0) {
            break
        }
        fragment.insertBefore(pre, fragment.firstChild)

    }
    fragment.appendChild(node)
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
// {}  -->  {xx: 0, yy: 1, zz: 2} add
// {xx: 0, yy: 1, zz: 2}  -->  {xx: 0, yy: 1, zz: 2, uu: 3}
// [xx: 0, yy: 1, zz: 2}  -->  {xx: 0, zz: 1, yy: 2}

function getProxyVM(binding) {
    var agent = binding.xtype === "object" ? withProxyAgent : eachProxyAgent
    var proxy = agent(binding)
    var node = proxy.$anchor || (proxy.$anchor = binding.element.cloneNode(false))
    node.nodeValue = binding.signature
    proxy.$outer = binding.$outer
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
    return proxy
}

function eachProxyFactory(itemName) {
    var source = {
        $outer: {},
        $index: 0,
        $oldIndex: 0,
        $anchor: null,
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

function decorateProxy(proxy, binding, type) {
    if (type === "array") {
        proxy.$remove = function () {
            binding.$repeat.removeAt(proxy.$index)
        }
        proxy.$watch(binding.param, function (a) {
            binding.$repeat[proxy.$index] = a
        })
    } else {
        proxy.$watch("$val", function (a) {
            binding.$repeat[proxy.$key] = a
        })
    }
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