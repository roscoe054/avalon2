/*********************************************************************
 *                           modelFactory                             *
 **********************************************************************/
//avalon最核心的方法的两个方法之一（另一个是avalon.scan），返回一个ViewModel(VM)
var VMODELS = avalon.vmodels = {} //所有vmodel都储存在这里
avalon.define = function (definition) {
    var $id = definition.$id
    if (!$id) {
        log("warning: vm必须指定$id")
    }
    if (VMODELS[$id]) {
        log("warning: " + $id + " 已经存在于avalon.vmodels中")
    }
    return VMODELS[$id] = modelFactory($id)
}

//一些不需要被监听的属性

var $reserve = ["$watchers", "$id", "$data", "$parent", "$compute"]
var $reserveObject = oneObject($reserve, true)

function hackDescriptor(definition, name, value) {
    var descriptor = makeDescriptor(value, name)
    Object.defineProperty(definition, name, {
        get: descriptor,
        set: descriptor,
        enumerable: true,
        configurable: true
    })
}

function makeDescriptor(name, value) {
    function descriptor(value) {
        var oldValue = descriptor._value
        if (arguments.length > 0) {
            if (!isEqual(value, oldValue)) {
                descriptor.updateValue(this, value)
                descriptor.notify(this, value, oldValue)
            }
            return this
        } else {
            dependencyDetection.collectDependency(this, descriptor)
            return oldValue
        }
    }
    descriptorFactory(accessor, name)
    tryHackObjectDescriptor(accessor, value)
    return descriptor;
}

function hackCompute() {
}

function makeCompute(){
}
function modelFactory(definition) {

    for (var name in definition) {
        if (definition.hasOwnProperty(name)) {
            if (!$reserveObject[name] || typeof $reserveObject[name] === "function") {
                hackDescriptor(definition, name, definition[name])
            }
        }
    }
    definition.$parent = null
    var computes = definition.$compute
    if (typeof computes === "object") {
        for (var name in computes) {
            if (computes.hasOwnProperty(name)) {
                hackDescriptor(definition, name, computes[name])
            }
        }
    }

    definition.$watchers = []
    definition.__proto__ = vmProto

    return definition
}
var vmProto = {}
//创建一个简单访问器
function makeSimpleAccessor(name, value) {
    function accessor(value) {
        var oldValue = accessor._value
        hackDescriptors(value, this)
        if (arguments.length > 0) {
            if (!isEqual(value, oldValue)) {
                accessor.updateValue(this, value)
                accessor.notify(this, value, oldValue)
            }
            return this
        } else {
            dependencyDetection.collectDependency(this, accessor)
            return oldValue
        }
    }
    accessorFactory(accessor, name)
    accessor._value = value
    return accessor;
}

//创建一个计算访问器
function makeComputedAccessor(name, options) {
    options.set = options.set || noop
    function accessor(value) {//计算属性
        var oldValue = accessor._value
        var init = "_value" in accessor
        if (arguments.length > 0) {
            if (stopRepeatAssign) {
                return this
            }
            accessor.set.call(this, value)
            return this
        } else {
            //将依赖于自己的高层访问器或视图刷新函数（以绑定对象形式）放到自己的订阅数组中
            dependencyDetection.collectDependency(this, accessor)
            if (!accessor.digest) {
                var vm = this
                var id
                accessor.digest = function () {
                    accessor.updateValue = globalUpdateModelValue
                    accessor.notify = noop
                    accessor.call(vm)
                    clearTimeout(id)//如果计算属性存在多个依赖项，那么等它们都更新了才更新视图
                    id = setTimeout(function () {
                        accessorFactory(accessor, accessor._name)
                        accessor.call(vm)
                    })
                }
            }
            dependencyDetection.begin({
                callback: function (vm, dependency) {//dependency为一个accessor
                    var name = dependency._name
                    if (dependency !== accessor) {
                        var list = vm.$events[name]
                        injectDependency(list, accessor.digest)
                    }
                }
            })
            try {
                value = accessor.get.call(this)
            } finally {
                dependencyDetection.end()
            }
            if (oldValue !== value) {
                accessor.updateValue(this, value)
                init && accessor.notify(this, value, oldValue) //触发$watch回调
            }
            //将自己注入到低层访问器的订阅数组中
            return value
        }
    }
    accessor.set = options.set || noop
    accessor.get = options.get
    accessorFactory(accessor, name)
    return accessor
}

//创建一个复杂访问器
function makeComplexAccessor(name, initValue, valueType) {
    function accessor(value) {
        var oldValue = accessor._value
        var son = accessor._vmodel
        if (arguments.length > 0) {
            if (stopRepeatAssign) {
                return this
            }
            if (valueType === "array") {

                var old = son._
                son._ = []
                son.clear()
                son._ = old
                son.pushArray(value)
            } else if (valueType === "object") {
                var $proxy = son.$proxy
                var observes = this.$events[name] || []
                son = accessor._vmodel = modelFactory(value)
                son.$proxy = $proxy
                if (observes.length) {
                    observes.forEach(function (data) {
                        if (data.rollback) {
                            data.rollback() //还原 ms-with ms-on
                            bindingHandlers[data.type](data, data.vmodels)
                        }
                    })
                    son.$events[name] = observes
                }
            }
            accessor.updateValue(this, son.$model)
            accessor.notify(this, this._value, oldValue)
            return this
        } else {
            dependencyDetection.collectDependency(this, accessor)
            return son
        }
    }
    accessorFactory(accessor, name)
    accessor._vmodel = modelFactory(initValue)
    return accessor
}

function globalUpdateValue(vmodel, value) {
    vmodel.$model[this._name] = this._value = value
}
function globalUpdateModelValue(vmodel, value) {
    vmodel.$model[this._name] = value
}
function globalNotify(vmodel, value, oldValue) {
    var name = this._name
    var array = vmodel.$events[name] //刷新值
    if (array) {
        fireDependencies(array) //同步视图
        EventBus.$fire.call(vmodel, name, value, oldValue) //触发$watch回调
    }
}

function accessorFactory(accessor, name) {
    accessor._name = name
    //同时更新_value与model
    accessor.updateValue = globalUpdateValue
    accessor.notify = globalNotify
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

