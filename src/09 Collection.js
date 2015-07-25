/*********************************************************************
 *          监控数组（与ms-each, ms-repeat配合使用）                     *
 **********************************************************************/

var arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
var arrayProto = Array.prototype
var newProto = {
    notify: function () {
        var deps = this.$deps
        for (var i = 0, l = deps.length; i < l; i++) {
            notifySubscribers(deps[i])
        }
    },
    set: function (index, val) {
        if (index >= this.length) {
            this.length = index + 1
        }
        return this.splice(index, 1, val)[0]
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
        if (index >= 0) {
            this.splice(index, 1)
        }
        return  []
    },
    removeAll: function (all) { //移除N个元素
        var oldLength = this.length
        if (Array.isArray(all)) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (all.indexOf(this[i]) !== -1) {
                    _splice.apply(this, i, 1)
                }
            }
        } else if (typeof all === "function") {
            for (i = this.length - 1; i >= 0; i--) {
                var el = this[i]
                if (all(el, i)) {
                    _splice.apply(this, i, 1)
                }
            }
        } else {
            _splice.apply(this, 0, this.length)
        }
        this.notify()
        if (oldLength !== this.length) {
            this.$fire("length", this.length, oldLength)
        }
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
        var oldLength = this.length
        var i = arguments.length
        var args = new Array(i)
        while (i--) {
            args[i] = arguments[i]
        }
        var result = original.apply(this, args)
        var inserted
        switch (method) {
            case 'push':
                inserted = args
                break
            case 'unshift':
                inserted = args
                break
            case 'splice':
                inserted = args.slice(2)
                break
        }

        if (inserted)
            observeItem(inserted)
        this.notify()
        if (oldLength !== this.length) {
            this.$fire("length", this.length, oldLength)
        }
        return result
    }
})

