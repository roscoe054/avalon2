/*********************************************************************
 *          监控数组（与ms-each, ms-repeat配合使用）                     *
 **********************************************************************/

var arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
var arrayProto = Array.prototype
var newProto = {}

arrayMethods.forEach(function (method, index) {
    var original = arrayProto[method]
    newProto[method] = function () {
        // avoid leaking arguments:
        // http://jsperf.com/closure-with-arguments
        var i = arguments.length
        var args = new Array(i)
        while (i--) {
            args[i] = arguments[i]
        }
        var result = original.apply(this, args)
        var ob = this
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
        ob.notify()
        return result
    }
})

newProto.notify = function () {
  var deps = this.$deps
  for (var i = 0, l = deps.length; i < l; i++) {
    deps[i].notify()
  }
}
//容器的键值对发生变动，容器的子属性发生变动
newProto.set = function (index, val) {
   if (index >= this.length) {
      this.length = index + 1
    }
  
   // proxy = proxies[pos]
    return this.splice(index, 1, val)[0]
}
newProto.remove = function (el) { //移除第一个等于给定值的元素
    return this.removeAt(this.indexOf(el))
}
newProto.removeAt = function (index) { //移除指定索引上的元素
    if (index >= 0) {
        this.splice(index, 1)
    }
    return  []
}
