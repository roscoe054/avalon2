avalon.directive("widget", {
    priority: 110,
    init: function (data) {
        var vmodels = data.vmodels
        var args = data.expr.match(rword)
        var elem = data.element
        var widget = args[0]
        var id = args[1]
        if (!id || id === "$") { //没有定义或为$时，取组件名+随机数
            id = generateID(widget)
        }
        var optName = args[2] || widget //没有定义，取组件名
        if (!avalon.ui[widget]) {
            elem.vmodels = vmodels
            
        } else {
            vmodels = elem.vmodels || vmodels
            data.expr = "[" + [JSON.stringify(widget), JSON.stringify(id), JSON.stringify(optName)] + "]"
          
        }
    },
    update: function (arr) {
        if (this.evaluator === noop) {
            return
        }
        var widget = arr[0]
        var id = arr[1]
        var optName = arr[2]
        var vmodels = this.vmodels
        var elem = this.element
        if (optName) {
            for (var i = 0, v; v = vmodels[i++]; ) {
                if (v.hasOwnProperty(optName) && typeof v[optName] === "object") {
                    var vmOptions = v[optName]
                    vmOptions = vmOptions.$model || vmOptions
                    break
                }
            }
        } else {
            vmOptions = {}
        }

        //抽取data-tooltip-text、data-tooltip-attr属性，组成一个配置对象
        var widgetData = avalon.getWidgetData(elem, widget)
        elem.msData["ms-widget-id"] = id
        this[widget + "Id"] = id
        this.evaluator = noop
        var constructor = avalon.ui[widget]
        var options = this[widget + "Options"] = avalon.mix({}, constructor.defaults, vmOptions || {}, widgetData)
        elem.removeAttribute("ms-widget")
        var vmodel = constructor(elem, this, vmodels) || {} //防止组件不返回VM
        if (vmodel.$id) {
            avalon.vmodels[id] = vmodel
            createSignalTower(elem, vmodel)
            try {
                vmodel.$init(function () {
                    avalon.scan(elem, [vmodel].concat(vmodels))
                    if (typeof options.onInit === "function") {
                        options.onInit.call(elem, vmodel, options, vmodels)
                    }
                })
            } catch (e) {
            }
            this.rollback = function () {
                try {
                    vmodel.widgetElement = null
                    vmodel.$remove()
                } catch (e) {
                }
                elem.msData = {}
                delete avalon.vmodels[vmodel.$id]
            }
            injectDisposeQueue(this, widgetList)
            if (window.chrome) {
                elem.addEventListener("DOMNodeRemovedFromDocument", function () {
                    setTimeout(rejectDisposeQueue)
                })
            }
        } else {
            avalon.scan(elem, vmodels)
        }
    }
})
var widgetList = []
//不存在 bindingExecutors.widget
