bindingHandlers["if"] =
    bindingHandlers.data =
    bindingHandlers.text =
    bindingHandlers.html =
    function(data, vmodels) {
        parseExprProxy(data.value, vmodels, data)
}

bindingExecutors["if"] = function(val, elem, data) {
      var vnode = addVnodeToData(elem, data)
      vnode.ifValue = !!val
      vnode.ifData = data
      vnode.addTask("if")
}