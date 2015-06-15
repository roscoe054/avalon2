
var rword = /[^, ]+/g
var $$skipArray = String("$id,$watch,$unwatch,$fire,$events,$model,$skipArray,$proxy").match(rword)


function modelFactory(source, $special, $model) {

    //0 null undefined || Node || VModel(fix IE6-8 createWithProxy $val: val引发的BUG)
    if (!source || source.nodeType > 0 || (source.$id && source.$events)) {
        return source
    }
    var $skipArray = Array.isArray(source.$skipArray) ? source.$skipArray : []
    $skipArray.$special = $special || {} //强制要监听的属性
   
    $model = $model || {} //vmodels.$model属性
   
    $$skipArray.forEach(function (name) {
        delete source[name]
    })
    var data = {}
    var $vmodel = {}
    var methods = {}
    var computed = {}
    var props = {}
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            var value = source[name]
            if (typeof source[name] === "function") {
                methods[name] = value //需要处理this
            } else if ($skipArray.indexOf(name) !== -1) {
                props[name] = value  //不做处理
            } else if (value && value.nodeType) {
                props[name] = value //不做处理
            } else if (name.charAt(0) === "$" && !$special[name]) {
                props[name] = value //不做处理
            } else if (typeof value === "object" && typeof (value.get) && Object.keys(value).length <= 2) {
                computed[name] = value //计算属性
                $vmodel[name] = {
                    get: value.get || function(){},
                    set: value.set
                }
                
            } else {
                data[name] = value
                $vmodel[name] = function (value) {
                    if (arguments.length) {
                        this.$model[name] = value
                    } else {
                        return this.$model
                    }
                }
            }
        }
    }

    $vmodel = Object.defineProperties($vmodel, descriptorFactory($vmodel)) //生成一个空的ViewModel
    $vmodel.$model = $model
    
    
    Observer.create(data).addVM($vmodel)
    
    
//     this._initProps()
//  this._initData()
//  this._initComputed()
//  this._initMethods()
//  this._initMeta()
    return $vmodel
}
function Observer(value, type) {
    this.id = ++uid
    this.value = value
    this.active = true
    this.deps = []
    _.define(value, '__ob__', this)
    if (type === ARRAY) {
        var augment = config.proto && _.hasProto
                ? protoAugment
                : copyAugment
        augment(value, arrayMethods, arrayKeys)
        this.observeArray(value)
    } else if (type === OBJECT) {
        this.walk(value)
    }
}

Observer.create = function (value) {
    if (
            value &&
            value.hasOwnProperty('__ob__') &&
            value.__ob__ instanceof Observer
            ) {
        return value.__ob__
    } else if (_.isArray(value)) {
        return new Observer(value, ARRAY)
    } else if (
            _.isPlainObject(value) &&
            !value._isVue // avoid Vue instance
            ) {
        return new Observer(value, OBJECT)
    }
}
Observer.setTarget = function (watcher) {
  Dep.target = watcher
}

// Instance methods

var p = Observer.prototype

p.walk = function (obj) {
    var keys = Object.keys(obj)
    var i = keys.length
    var key, prefix
    while (i--) {
        key = keys[i]

            this.convert(key, obj[key])
     
    }
}