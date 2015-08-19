avalon.directive("repeat", {
    priority: 90,
    init: function (binding) {
        var type = binding.type
        binding.cache = {} //用于存放代理VM
        binding.enterCount = 0

        var elem = binding.element
        if (elem.nodeType === 1) {
            elem.removeAttribute(binding.name)
            effectBinding(elem, binding)
            binding.param = binding.param || "el"
            binding.sortedCallback = getBindingCallback(elem, "data-with-sorted", binding.vmodels)
            binding.renderedCallback = getBindingCallback(elem, "data-" + type + "-rendered", binding.vmodels)
            var signature = generateID(type)
            var start = DOC.createComment(signature + ":start")
            var end = binding.element = DOC.createComment(signature + ":end")
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

        this.enterCount += 1
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
        var action = "move"
        binding.$repeat = value
        var fragments = []
        var transation = init && avalonFragment.cloneNode(false)
        var proxies = []
        var param = this.param
        var retain = avalon.mix({}, this.cache)

        var elem = this.element
        var length = track.length

        var parent = elem.parentNode
        for (i = 0; i < length; i++) {

            var keyOrId = track[i] //array为随机数, object 为keyName
            var proxy = retain[keyOrId]
            if (!proxy) {
                proxy = getProxyVM(this)

                if (xtype === "array") {
                    action = "add"
                    proxy.$id = keyOrId
                    proxy[param] = value[i] //index

                } else {
                    action = "append"
                    proxy.$key = keyOrId
                    proxy.$val = value[keyOrId] //key
                }
                this.cache[keyOrId] = proxy
                var node = proxy.$anchor || (proxy.$anchor = elem.cloneNode(false))
                node.nodeValue = this.signature
                shimController(binding, transation, proxy, fragments, init && !binding.effectDriver)
                decorateProxy(proxy, binding, xtype)
            } else {
                fragments.push({})
                retain[keyOrId] = true
            }

            //重写proxy
            if (this.enterCount === 1) {// 防止多次进入,导致位置不对
                proxy.$active = false
                proxy.$oldIndex = proxy.$index
                proxy.$active = true
                proxy.$index = i
            }

            if (xtype === "array") {
                proxy.$first = i === 0
                proxy.$last = i === length - 1
            } else {
                proxy.$val = toJson(value[keyOrId]) // 这里是处理vm.object = newObject的情况 
            }
            proxies.push(proxy)
        }
        this.proxies = proxies
        if (init && !binding.effectDriver) {
            parent.insertBefore(transation, elem)
            fragments.forEach(function (fragment) {
                scanNodeArray(fragment.nodes || [], fragment.vmodels)
                fragment.nodes = fragment.vmodels = null
            })// jshint ignore:line
        } else {

            var staggerIndex = binding.staggerIndex = 0
            for (keyOrId in retain) {
                if (retain[keyOrId] !== true) {
                    action = "del"
                    removeItem(retain[keyOrId].$anchor, binding)
                    // avalon.log("删除", keyOrId)
                    // 相当于delete binding.cache[key]
                    proxyRecycler(this.cache, keyOrId, param)
                    retain[keyOrId] = null
                }
            }

            //  console.log(effectEnterStagger)
            for (i = 0; i < length; i++) {
                proxy = proxies[i]
                keyOrId = xtype === "array" ? proxy.$id : proxy.$key
                var pre = proxies[i - 1]
                var preEl = pre ? pre.$anchor : binding.start
                if (!retain[keyOrId]) {//如果还没有插入到DOM树
                    (function (fragment, preElement) {
                        var nodes = fragment.nodes
                        var vmodels = fragment.vmodels
                        if (nodes) {
                            staggerIndex = mayStaggerAnimate(binding.effectEnterStagger, function () {
                                parent.insertBefore(fragment.content, preElement.nextSibling)
                                scanNodeArray(nodes, vmodels)
                                animateRepeat(nodes, 1, binding)
                            }, staggerIndex)
                        }
                        fragment.nodes = fragment.vmodels = null
                    })(fragments[i], preEl)// jshint ignore:line
                    // avalon.log("插入")

                } else if (proxy.$index !== proxy.$oldIndex) {
                    (function (proxy2, preElement) {
                        staggerIndex = mayStaggerAnimate(binding.effectEnterStagger, function () {
                            var curNode = removeItem(proxy2.$anchor)// 如果位置被挪动了
                            var inserted = avalon.slice(curNode.childNodes)
                            parent.insertBefore(curNode, preElement.nextSibling)
                            animateRepeat(inserted, 1, binding)
                        }, staggerIndex)
                    })(proxy, preEl)// jshint ignore:line

                    // avalon.log("移动", proxy.$oldIndex, "-->", proxy.$index)
                }
            }

        }
        if (!value.$track) {//如果是非监控对象,那么就将其$events清空,阻止其持续监听
            for (keyOrId in this.cache) {
                proxyRecycler(this.cache, keyOrId, param)
            }

        }


//repeat --> duplex
        var callback = binding.renderedCallback
        if (callback) {
            (function (fn, args) {
                // console.log("+++++")
                renderedCallbacks.push(function () {
                    fn.call(parent, args)
                    avalon.log("耗时 ", new Date() - now)
                    if (parent.oldValue && parent.tagName === "SELECT") { //fix #503

                        avalon(parent).val(parent.oldValue.split(","))
                    }

                })//兼容早期的传参方式
                if (!(init && !binding.effectDriver) && renderedCallbacks.length) {
                    renderedCallbacks.pop().call(parent)
                }
            })(callback, kernel.newWatch ? arguments : action)

        }
        this.enterCount -= 1
        //  avalon.log("耗时 ", new Date() - now)

    }

})

"with,each".replace(rword, function (name) {
    directives[name] = avalon.mix({}, directives.repeat, {
        priority: 1400
    })
})


function animateRepeat(nodes, isEnter, binding) {
    for (var i = 0, node; node = nodes[i++]; ) {
        if (node.className === binding.effectClass) {
            avalon.effect.apply(node, isEnter, noop, noop, binding)
        }
    }
}

function mayStaggerAnimate(staggerTime, callback, index) {
    if (staggerTime) {
        setTimeout(callback, (++index) * staggerTime)
    } else {
        callback()
    }
    return index
}


function removeItem(node, binding) {
    var fragment = avalonFragment.cloneNode(false)
    var last = node
    var breakText = last.nodeValue
    var staggerIndex = binding && Math.max(+binding.staggerIndex, 0)
    while (true) {
        var pre = node.previousSibling
        if (!pre || String(pre.nodeValue).indexOf(breakText) === 0) {
            break
        }

        if (binding && (pre.className === binding.effectClass)) {
            node = pre;
            (function (cur) {
                binding.staggerIndex = mayStaggerAnimate(binding.effectLeaveStagger, function () {
                    avalon.effect.apply(cur, 0, noop, function () {
                        fragment.appendChild(cur)
                    }, binding)
                }, staggerIndex)
            })(pre);// jshint ignore:line
        } else {
            fragment.insertBefore(pre, fragment.firstChild)
        }
    }
    fragment.appendChild(last)
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
            break
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
        var param = binding.param
        proxy.$watch(param, function fn(a) {
            var index = proxy.$index
            binding.$repeat[index] = a
        })
    } else {
        proxy.$watch("$val", function fn(a) {
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
        $val: NaN,
        $index: 0,
        $oldIndex: 0,
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


function proxyRecycler(cache, key, param) {
    var proxy = cache[key]
    if (proxy) {
        var proxyPool = proxy.$id.indexOf("$proxy$each") === 0 ? eachProxyPool : withProxyPool
        proxy.$outer = {}

        for (var i in proxy.$events) {
            var a = proxy.$events[i]
            if (Array.isArray(a)) {
                a.length = 0
                if (i === param) {
                    proxy[param] = NaN

                } else if (i === "$val") {
                    proxy.$val = NaN
                }
            }
        }

        if (proxyPool.unshift(proxy) > kernel.maxRepeatSize) {
            proxyPool.pop()
        }
        delete cache[key]
    }
}