// bindingHandlers.data 定义在if.js
bindingExecutors.data = function (val, elem, data) {
    var key = "data-" + data.param
    var vnode = addVnodeToData(elem, data)
    vnode.props[key] = val && typeof val === "object" ? val : String(val)
    vnode.addTask("attr")
}