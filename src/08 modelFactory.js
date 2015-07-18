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
var $$skipArray = String("$id,$watch,$unwatch,$fire,$events,$model,$skipArray,$proxy,$active,$deps").match(rword)
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
var nullSpecial = {}
function modelFactory(source, $special) {
    return observeObject(source, $special)
}

function observe(obj) {
    if (!obj || (obj.$id && obj.$deps)) {
        return obj
    }
    if (Array.isArray(obj)) {
        return observeArray(obj)
    } else if (avalon.isPlainObject(obj)) {
        return observeObject(obj)
    }
}

function observeArray(array) {
    for (var i in newProto) {
        array[i] = newProto[i]
    }
    array.$active = true
    array.$deps = []
    observeItem(array)
    return array
}
function observeItem(items) {
    var i = items.length
    while (i--) {
        observe(items[i])
    }
}

function observeObject(source, $special) {
    if (!source || source.nodeType > 0 || (source.$id && source.$deps)) {
        return source
    }
    var $skipArray = Array.isArray(source.$skipArray) ? source.$skipArray : []
    $special = $special || nullSpecial
    // oldAccessors = oldAccessors || nullSpecial
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
                accessors[name] = makeGetSet(name, val)
            }
        }
    })
    /* jshint ignore:end */

    $vmodel = Object.defineProperties($vmodel, accessors)
    if (!W3C) {
        $vmodel.hasOwnProperty = function (name) {
            return names.indexOf(name) !== -1
        }
    }
    hideProperty($vmodel, "$active", true)
    //  hideProperty($vmodel, "$accessors", accessors)
    hideProperty($vmodel, "$events", {})
    hideProperty($vmodel, "$id", new Date - 0)
    hideProperty($vmodel, "$deps", [])
    return $vmodel
}

function makeGetSet(key, value) {
    var childOb = observe(value)
    var subs = []
    if (childOb) {
        childOb.$deps.push(subs)
        value = childOb
    }
    return {
        key: key,
        get: function () {
            if (this.$active) {
                if (!this.$events[key]) {
                    this.$events[key] = subs
                }
                collectDependency(subs)
            }
            return value
        },
        set: function (newVal) {
            if (newVal === value)
                return
            if (childOb) {
                avalon.Array.remove(childOb.$deps, subs)
            }
            value = newVal
            // add dep to new value
            var newChildOb = observe(newVal, childOb)
            if (newChildOb) {
                newChildOb.$deps.push(subs)
                value = newChildOb
            }
            notifySubscribers(subs)
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
    for (var i = 0, l = subs.length; i < l; i++) {
        subs[i].update()
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