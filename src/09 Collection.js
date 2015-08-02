/*********************************************************************
 *          监控数组（与ms-each, ms-repeat配合使用）                     *
 **********************************************************************/

var arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
var arrayProto = Array.prototype
var newProto = {
    notify: function () {
        var subs = this.$events[subscribers]
        notifySubscribers(subs)
    },
    set: function (index, val) {
        if (((index >>> 0) === index) && this[index] !== val) {
//            var uniq = {}
//            this[index] = observe(val, this[index], true)
//            console.log("cccc")
//            this.$deps.forEach(function (arr) {
//                arr.forEach(function (el) {
//                    var key = el.signature
//                    if (key && !uniq[key] && el.proxies) {
//                        uniq[key] = 1
//                        el.proxies[index].$events[el.param || "el"].forEach(function (elem) {
//                            if (!elem.proxies && elem.update) {
//                                elem.update()
//                            }
//                        })
//                    }
//                })
//            })

            this.splice(index, 1, val)

        }
    },
    contains: function (el) { //判定是否包含
        return this.indexOf(el) !== -1
    },
    ensure: function (el) {
        if (!this.contains(el)) { //只有不存在才push
            this.push(el)
        }
        return this
    },
    pushArray: function (arr) {
        return this.push.apply(this, arr)
    },
    remove: function (el) { //移除第一个等于给定值的元素
        return this.removeAt(this.indexOf(el))
    },
    removeAt: function (index) { //移除指定索引上的元素
        if ((index >>> 0) === index) {
            this.splice(index, 1)
        }
    },
    size: function () { //取得数组长度，这个函数可以同步视图，length不能
        return this._.length
    },
    removeAll: function (all) { //移除N个元素
        if (Array.isArray(all)) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (all.indexOf(this[i]) !== -1) {
                    _splice.call(this, i, 1)
                    _splice.call(this.$proxy, i, 1)
                }
            }
        } else if (typeof all === "function") {
            for (i = this.length - 1; i >= 0; i--) {
                var el = this[i]
                if (all(el, i)) {
                    _splice.call(this, i, 1)
                    _splice.call(this.$proxy, i, 1)
                }
            }
        } else {
            _splice.call(this, 0, this.length)
            _splice.call(this.$proxy, 0, this.length)
        }
        if (!W3C) {
            this.$model = toJson(this)
        }
        this.notify()
        this._.length = this.length
    },
    clear: function () {
        return this.removeAll()
    }
}
var _splice = arrayProto.splice
arrayMethods.forEach(function (method) {
    var original = arrayProto[method]
    newProto[method] = function () {
        // avoid leaking arguments:
        // http://jsperf.com/closure-with-arguments
        var args = []
        for (var i = 0, n = arguments.length; i < n; i++) {
            args[i] = observe(arguments[i], 0, 1)
        }
        var result = original.apply(this, args)
        asyncProxy(this.$proxy, method, args)
        if (!W3C) {
            this.$model = toJson(this)
        }
        this.notify()
        this._.length = this.length
        return result
    }
})

function asyncProxy(proxies, method, args) {
    switch (method) {
        case 'push':
        case 'unshift':
            args = createProxy(args.length)
            break
        case 'splice':
            if (args.length > 2) {
                args = [args[0], args[1]].concat(createProxy(args.length - 2))
            }
            break
    }
    Array.prototype[method].apply(proxies, args)
}

function createProxy(n) {
    var ret = []
    for (var i = 0; i < n; i++) {
        ret[i] = eachProxyFactory("el")
    }
    return ret
}