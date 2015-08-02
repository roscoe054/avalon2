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

        var xtype = avalon.type(value)
        var binding = this
        if (xtype !== "array" && xtype !== "object") {
            avalon.log("warning:" + binding.expr + "只能是对象或数组")
            return
        }
        //  if (this.updating)
        //      return
        this.updating = true
        var init = !oldValue
        var now = new Date()
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

        binding.$repeat = value
        var fragments = []
        var transation = init && avalonFragment.cloneNode(false)
        var proxies = []
        var param = this.param
        var retain = avalon.mix({}, this.cache)
        var elem = this.element
        var length = value.length
        var source = toJson(value)
        var parent = elem.parentNode

        for (i = 0; i < length; i++) {
            var id = value.$proxy[i]
            var proxy = retain[id]
            if (!proxy) {
                //  console.log(el)
                proxy = getProxyVM(this)
                proxy.$id = id
                //  proxy = cloneProxy(el, param, xtype)
                this.cache[id] = proxy

                proxy[param] = source[i]
                var node = proxy.$anchor || (proxy.$anchor = elem.cloneNode(false))
                node.nodeValue = this.signature
                shimController(binding, transation, proxy, fragments, init)
                decorateProxy(proxy, binding, xtype)
            } else {
                fragments.push({})
                retain[id] = true
            }
//重写proxy
            proxy.$active = false
            proxy.$oldIndex = proxy.$index
            proxy.$active = true
            proxy.$index = i
            if (xtype === "array") {
                proxy.$first = i === 0
                proxy.$last = i === length - 1
            } else {
                // proxy.$key = index
                //  proxy.$val = source[index]

            }
            proxies.push(proxy)
        }
        this.$proxy = proxies
        if (init) {

            parent.insertBefore(transation, elem)
            fragments.forEach(function (fragment) {
                scanNodeArray(fragment.nodes || [], fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            })// jshint ignore:line
        } else {
            for (i in retain) {
                if (retain[i] !== true) {
                    removeItem(retain[i].$anchor, "remove")
                    console.log("删除")
                    // 相当于delete binding.cache[key]
                    proxyRecycler(binding.cache, i)
                    retain[i] = null
                }
            }
            for (i = 0; i < length; i++) {
                proxy = proxies[i]

                var pre = proxies[i - 1]
                var preEl = pre ? pre.$anchor : binding.start
                var fragment = fragments[i]

                if (!retain[proxy.$id]) {
                    //如果还没有插入到DOM树 或者 位置被挪动了
                    parent.insertBefore(fragment.content, preEl.nextSibling)
                    fragment.nodes && scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                    console.log("插入")

                } else if (proxy.$index !== proxy.$oldIndex) {
                    var curNode = removeItem(proxy.$anchor)
                    parent.insertBefore(curNode, preEl.nextSibling)
                    //  proxy.$active = false
                    console.log("移动", proxy.$index, "-->", proxy.$oldIndex)
                    //   proxy.$active = false
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