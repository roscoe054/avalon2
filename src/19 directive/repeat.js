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
        var init = !oldValue

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
            var el = value.$proxy[i]
            var id = el.$id
            var proxy = retain[id]
            if (!proxy) {
                //  console.log(el)
                proxy = cloneProxy(el, param, xtype)
                this.cache[proxy.$id] = proxy

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
            proxy.$outer = binding.$outer
            if (xtype === "array") {
                proxy.$first = i === 0
                proxy.$last = i === length - 1
            } else {
                // proxy.$key = index
                //  proxy.$val = source[index]

            }
            proxies.push(proxy)
        }

        if (init) {

            parent.insertBefore(transation, elem)
            fragments.forEach(function (fragment) {
                scanNodeArray(fragment.nodes || [], fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            })// jshint ignore:line
        } else {
            for (i in retain) {
                if (retain[i] !== true) {
                    removeItem(retain[i].$anchor)
                    // 相当于delete binding.cache[key]
                    proxyRecycler(binding.cache, i)
                    retain[i] = null
                }
            }
            for (i = 0; i < length; i++) {
                el = value.$proxy[i]
                id = el.$id
                proxy = retain[id]
                var pre = proxies[i - 1]
                var preEl = pre ? pre.$anchor : binding.start
                var fragment = fragments[i]

                if (!proxy) {
                    //如果还没有插入到DOM树 或者 位置被挪动了
                    console.log(fragment.content, preEl.nextSibling)
                    parent.insertBefore(fragment.content, preEl.nextSibling)
                    fragment.nodes && scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                    console.log("插入")

                } else if (proxy.$index !== proxy.$oldIndex) {
                }
            }


        }





    }

})

"with,each".replace(rword, function (name) {
    directives[name] = avalon.mix({}, directives.repeat, {
        priority: 1400
    })
})

function cloneProxy(proxy, name, type) {
    if (type === "array") {
        if (name !== "el") {
            var clone = {}
            var accessors = proxy.$accessors
            accessors[name] = accessors["el"]
            delete accessors["el"]
            clone = Object.defineProperties(clone, accessors)
            var names = [name]
            for (var i in proxy) {
                if (proxy.hasOwnProperty(i) && i !== "el") {
                    if (!accessors[i]) {
                        clone[i] = proxy[i] //复制非监听的属性
                    }
                    names.push(i)
                }
            }
            "$active,$events,$proxy,$id".replace(rword, function (name) {
                hideProperty(clone, name, proxy[name])
            })
            clone.$accessors = proxy.$accessors

            /* jshint ignore:start */
            if (!W3C) {
                $vmodel.hasOwnProperty = function (name) {
                    return names.indexOf(name) !== -1
                }
            } else {
                hideProperty($vmodel, "hasOwnProperty", function (name) {
                    return names.indexOf(name) !== -1
                })
            }
            /* jshint ignore:end */
            if (!kernel.newWatch) {
                for (i in EventBus) {
                    if (W3C) {
                        hideProperty(clone, i, EventBus[i])
                    } else {
                        clone[i] = EventBus[i].bind(clone)
                    }
                }
            }
            return clone
        }
    }
    return proxy
}

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
// {}  -->  {xx: 0, yy: 1, zz: 2} add
// {xx: 0, yy: 1, zz: 2}  -->  {xx: 0, yy: 1, zz: 2, uu: 3}
// [xx: 0, yy: 1, zz: 2}  -->  {xx: 0, zz: 1, yy: 2}

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