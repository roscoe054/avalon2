//avalon最核心的方法的两个方法之一（另一个是avalon.scan），返回一个ViewModel(VM)
var VMODELS = avalon.vmodels = {} //所有vmodel都储存在这里
avalon.define = function (id, factory) {
    var $id = id.$id || id
    if (!$id) {
        log("warning: vm必须指定$id")
    }
    if (VMODELS[$id]) {
        log("warning: " + $id + " 已经存在于avalon.vmodels中")
    }
    if (typeof id === "object") {
        var model = modelFactory(id)
    } else {
        var scope = {
            $watch: noop
        }
        factory(scope) //得到所有定义

        model = modelFactory(scope) //偷天换日，将scope换为model
        stopRepeatAssign = true
        factory(model)
        stopRepeatAssign = false
    }

    model.$id = $id
    return VMODELS[$id] = model
}

//一些不需要被监听的属性
var $$skipArray = oneObject("$id,$watch,$unwatch,$fire,$events,$model,$skipArray,$active,$pathname,$up,$track,$accessors")
var defineProperty = Object.defineProperty
var canHideOwn = true
//如果浏览器不支持ecma262v5的Object.defineProperties或者存在BUG，比如IE8
//标准浏览器使用__defineGetter__, __defineSetter__实现
try {
    defineProperty({}, "_", {
        value: "x"
    })
    var defineProperties = Object.defineProperties
} catch (e) {
    canHideOwn = false
}

function modelFactory(source, $special) {
    var vm = observeObject(source, $special, true)
    vm.$watch = function () {
        return $watch.apply(vm, arguments)
    }
    vm.$fire = function (path, a) {
        $emit.call(vm, path, [a])
    }
    return vm
}

//监听对象属性值的变化(注意,数组元素不是数组的属性),通过对劫持当前对象的访问器实现
//监听对象或数组的结构变化, 对对象的键值对进行增删重排, 或对数组的进行增删重排,都属于这范畴
//   通过比较前后代理VM顺序实现
function Component() {
}
function observeObject(source, $special, old, add) {
    if (!source || source.nodeType > 0 || (source.$id && source.$events)) {
        return source
    }

    var $skipArray = {}
    if (source.$skipArray) {
        $skipArray = oneObject(source.$skipArray)
        delete source.$skipArray
    }

    $special = $special || nullObject
    var oldAccessors = typeof old === "object" ? old.$accessors : nullObject
    var $vmodel = new Component() //要返回的对象, 它在IE6-8下可能被偷龙转凤
    var accessors = {} //监控属性
    var hasOwn = {}
    var skip = []
    var simple = []

    //处理计算属性
    var computed = source.$computed
    if (computed) {
        delete source.$computed
        for (var name in computed) {
            hasOwn[name] = true;
            (function (key, value) {
                var old
                accessors[key] = {
                    get: function () {
                        return old = value.get.call(this)
                    },
                    set: function (x) {
                        if (!stopRepeatAssign && typeof value.set === "function") {
                            var older = old
                            value.set.call(this, x)
                            var newer = this[key]
                            if (this.$fire && (newer !== older)) {
                                this.$fire(key, newer, older)
                            }
                        }
                    },
                    enumerable: true,
                    configurable: true
                }
            })(name, computed[name])// jshint ignore:line
        }
    }


    for (name in source) {
        var value = source[name]
        if (!$$skipArray[name])
            hasOwn[name] = true
        if (!$special[name] && (name.charAt(0) === "$" || $$skipArray[name] || $skipArray[name] ||
                typeof value === "function" || (value && value.nodeType))) {
            skip.push(name)
        } else {
            simple.push(name)
            if (oldAccessors[name]) {
                accessors[name] = oldAccessors[name]
            } else {
                accessors[name] = makeGetSet(name, value)
            }
        }
    }


    accessors["$model"] = $modelDescriptor
    $vmodel = defineProperties($vmodel, accessors, source)
    function trackBy(name) {
        return hasOwn[name] === true
    }

    skip.forEach(function (name) {
        $vmodel[name] = source[name]
    })

    /* jshint ignore:start */
    hideProperty($vmodel, "$id", "anonymous")
    hideProperty($vmodel, "$up", old ? old.$up : null)
    hideProperty($vmodel, "$track", Object.keys(hasOwn))
    hideProperty($vmodel, "$active", true)
    hideProperty($vmodel, "$pathname", old ? old.$pathname : "")
    hideProperty($vmodel, "$accessors", accessors)
    hideProperty($vmodel, "hasOwnProperty", trackBy)

    if (add) {
        hideProperty($vmodel, "$watch", function () {
            return $watch.aplly($vmodel, arguments)
        })
    }
    /* jshint ignore:end */

    //必须设置了$active,$events
    simple.forEach(function (name) {
        if (typeof $vmodel[name] === "object") {
            $vmodel[name].$up = $vmodel
            $vmodel[name].$pathname = name
        }

        $vmodel[name] = source[name]

        $emit.call($vmodel, name)
    })
    for (name in computed) {
        value = $vmodel[name]
    }
    return $vmodel
}

function observeArray(array, old, add) {
    if (old) {
        var args = [0, old.length].concat(array)
        old.splice.apply(old, args)
        return old
    } else {
        for (var i in newProto) {
            array[i] = newProto[i]
        }

        hideProperty(array, "$up", null)
        hideProperty(array, "$pathname", "")
        hideProperty(array, "$track", createTrack(array.length))

        array._ = observeObject({
            length: NaN
        })
        array._.$watch = $watch
        array._.length = array.length
        array._.$watch("length", function (a, b) {
            $emit.call(array.$up, array.$pathname + ".length", [a, b])
        })
        if (add) {
            array.$watch = function () {
                return $watch.aplly(array, arguments)
            }
        }

        if (W3C) {
            Object.defineProperty(array, "$model", $modelDescriptor)
        } else {
            array.$model = toJson(array)
        }

        for (var j = 0, n = array.length; j < n; j++) {
            array[j] = observe(array[j], 0, 1)
        }

        return array
    }
}

function observe(obj, old, hasReturn, add) {
    if (Array.isArray(obj)) {
        return observeArray(obj, old, add)
    } else if (avalon.isPlainObject(obj)) {
        if (old) {
            var keys = Object.keys(obj)
            var keys2 = Object.keys(old)
            if (keys.join(";") === keys2.join(";")) {
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        //0.6 版本   var hack = old[i]
                        old[i] = obj[i]
                    }
                }
                return old
            }
            old.$active = false
        }

        return observeObject(obj, null, old, add)
    }
    if (hasReturn) {
        return obj
    }
}
function makeGetSet(key, value, list) {
    var childVm = observe(value)//转换为VM
    if (childVm) {
        value = childVm
    } else {
        childVm = void 0
    }
    return {
        get: function () {
            if (this.$active) {
                //  collectDependency(this.$events[key])
            }
            return value
        },
        set: function (newVal) {
            if (value === newVal || stopRepeatAssign)
                return
            var oldValue = value

            childVm = observe(newVal, value)
            if (childVm) {
                value = childVm
            } else {
                childVm = void 0
                value = newVal
            }

            if (Object(childVm) === childVm) {
                childVm.$pathname = key
                childVm.$up = this
            }
            if (this.$active) {
                $emit.call(this, key, [value, oldValue])
            }
        },
        enumerable: true,
        configurable: true
    }
}


function hideProperty(host, name, value) {
    if (canHideOwn) {
        Object.defineProperty(host, name, {
            value: value,
            writable: true,
            enumerable: false,
            configurable: true
        })
    } else {
        host[name] = value
    }
}

function toJson(val) {
    var xtype = avalon.type(val)
    if (xtype === "array") {
        if (val.$events) {
            var array = []
            for (var i = 0; i < val.length; i++) {
                array[i] = toJson(val[i])
            }
            return array
        }
    } else if (xtype === "object" && val.$events) {
        var obj = {}
        for (i in val) {
            if (val.hasOwnProperty(i)) {
                obj[i] = toJson(val[i])
            }
        }
        return obj
    }
    return val
}

var $modelDescriptor = {
    get: function () {
        return toJson(this)
    },
    set: noop,
    enumerable: false,
    configurable: true
}

