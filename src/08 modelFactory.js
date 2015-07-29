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
    if (kernel.newWatch) {
        model.$watch = $watch
    }
    model.$id = $id
    return VMODELS[$id] = model
}

//一些不需要被监听的属性
var $$skipArray = String("$id,$watch,$unwatch,$fire,$events,$model,$skipArray,$active,$deps,$accessors").match(rword)
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
    return observeObject(source, $special)
}
function observe(obj, old, hasReturn) {
    if (Object(obj) === obj) {
//        if (obj.$deps) {
//            return obj
//        } else 
            if (Array.isArray(obj)) {
            return observeArray(obj, old)
        } else if (avalon.isPlainObject(obj)) {
            if (old) {
                var keys = Object.keys(obj)
                var keys2 = Object.keys(old)
                if (keys.join(";") === keys2.join(";")) {
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            console.log(i, obj[i])
                            old[i] = obj[i]
                        }
                    }
                    return old
                }
                old.$active = false

            }
            return observeObject(obj, null, old)
        }
    }
    if (hasReturn) {
        return obj
    }
}


function observeArray(array, old) {
    if (old) {
        var args = [0, old.length].concat(array)
        old.splice.apply(old, args)
        return old
    } else {
        for (var i in newProto) {
            array[i] = newProto[i]
        }

        hideProperty(array, "$active", true)
        hideProperty(array, "$events", {})
        hideProperty(array, "$deps", [])
        array._ = observeObject({
            length: NaN
        })
        array._.length = array.length
        array._.$watch("length", function (a, b) {
            array.$fire("length", a, b)
        })
        if (W3C) {
            Object.defineProperty(array, "$model", $modelDescriptor)
        } else {
            array.$model = []
        }
        if (!kernel.newWatch) {
            for (i in EventBus) {
                array[i] = EventBus[i]
            }
        }
        for (var j = 0, n = array.length; j < n; j++) {
            array[j] = observe(array[j], 0, 1)
        }

        return array
    }
}


function observeObject(source, $special, old) {
    if (!source || source.nodeType > 0 || (source.$id && source.$deps)) {
        return source
    }
    var $skipArray = Array.isArray(source.$skipArray) ? source.$skipArray : []
    $special = $special || nullObject
    var oldAccessors = old ? old.$accessors : nullObject
    var $vmodel = {} //要返回的对象, 它在IE6-8下可能被偷龙转凤
    var accessors = {} //监控属性
    $$skipArray.forEach(function (name) {
        delete source[name]
    })
    var names = Object.keys(source)
    /* jshint ignore:start */
    names.forEach(function (name) {
        var val = source[name]

        if (isObservable(name, val, $skipArray, $special)) {
            var valueType = avalon.type(val)
            if (valueType === "object" && isFunction(val.get) && Object.keys(val).length <= 2) {
                accessors[name] = {
                    get: function () {
                        return val.get.call(this)
                    },
                    set: function (a) {
                        if (!stopRepeatAssign && typeof val.set === "function") {
                            val.set.call(this, a)
                        }
                    },
                    enumerable: true,
                    configurable: true
                }
            } else {
                if (oldAccessors[name]) {
                    accessors[name] = oldAccessors[name]
                } else {
                    accessors[name] = makeGetSet(name, val)
                }
            }
        }
    })
    /* jshint ignore:end */

    accessors["$model"] = $modelDescriptor


    $vmodel = Object.defineProperties($vmodel, accessors)
    // if (!W3C) {
    /* jshint ignore:start */
    $vmodel.hasOwnProperty = function (name) {
        return names.indexOf(name) !== -1
    }
    /* jshint ignore:end */
    //  }
    names.forEach(function (name, val) {
        if (oldAccessors[name] || !accessors[name]) {

            $vmodel[name] = source[name]
        }
    })

    if (old) {
        old.$events = {}
    }
    hideProperty($vmodel, "$accessors", accessors)
    hideProperty($vmodel, "$id", "_" + (new Date - 0))
    hideProperty($vmodel, "$active", true)
    hideProperty($vmodel, "$events", {})
    hideProperty($vmodel, "$deps", [])
    if (!kernel.newWatch) {
        for (var i in EventBus) {
            if (W3C) {
                hideProperty($vmodel, i, EventBus[i])
            } else {
                $vmodel[i] = EventBus[i].bind($vmodel)
            }
        }
    }

    return $vmodel
}
function toJson(val) {
    if (Array.isArray(val)) {
        if (val.$active && val.$deps) {
            var array = []
            for (var i = 0; i < val.length; i++) {
                array[i] = toJson(val[i])
            }
            return array
        }
    } else if (val && typeof val === "object" && val.$active) {
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
function makeGetSet(key, value) {
    var childVm = observe(value)
    var subs = []
    if (childVm) {
        childVm.$deps.push(subs)
        value = childVm
    }
    return {
        key: key,
        get: function () {
            if (this.$active) {
              
                collectDependency(subs)
            }
            this.$events && (this.$events[key] = subs)
            return value
        },
        set: function (newVal) {
            if (value === newVal || stopRepeatAssign)
                return
            if (childVm) {
                avalon.Array.remove(childVm.$deps, subs)
            }

            var oldValue = value
            value = newVal
            var newVm = observe(newVal, oldValue)
            if (newVm) {
                newVm.$deps.push(subs)
                value = newVm
            }

            notifySubscribers(subs)
            if (this.$fire) {
                this.$events[key] = subs
                this.$fire(key, value, oldValue)
            }

        },
        enumerable: true,
        configurable: true
    }
}

//比较两个值是否相等
var isEqual = Object.is || function (v1, v2) {
    if (v1 === 0 && v2 === 0) {
        return 1 / v1 === 1 / v2
    } else if (v1 !== v1) {
        return v2 !== v2
    } else {
        return v1 === v2
    }
}

function isObservable(name, value, $skipArray, $special) {

    if (isFunction(value) || value && value.nodeType) {
        return false
    }
    if ($skipArray.indexOf(name) !== -1) {
        return false
    }
    if (name && name.charAt(0) === "$" && !$special[name]) {
        return false
    }
    return true
}




function collectDependency(subs) {
    dependencyDetection.collectDependency(subs)
}

function notifySubscribers(subs) {
    if (new Date() - beginTime > 444 && typeof subs[0] === "object") {
        rejectDisposeQueue()
    }
    for (var i = 0, sub; sub = subs[i++]; ) {
        sub.update && sub.update()
    }
}


function hideProperty(host, name, value) {
    if (Object.defineProperty) {
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


var $watch = function (expr, callback, option) {
    var watcher = {
        handler: callback,
        type: "text",
        element: root
    }
    parseExpr(expr, [this], watcher)
    avalon.injectBinding(watcher)
    return function () {
        watcher.element = null
    }
}