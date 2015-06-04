
bindingHandlers.text = bindingHandlers.html = function (data, vmodels) {
    var bigNumber = Number(data.param)
    var elem = data.element
    var isAppend = false
    var maybe = "v-" + data.type + bigNumber
  
    if (elem.nodeType === 1 && bigNumber > 1000) {
        var comments = getSignatures(elem, maybe)
        isAppend = comments.length
    }
   
    if (!isAppend) {
        var signature = bigNumber > 1000 ? maybe : generateID("v-" + data.type)
        data.signature = signature
        appendSignatures(elem, data, elem.nodeType !== 1)
    }
    parseExprProxy(data.value, vmodels, data)
}

bindingExecutors.text = function (val, elem, data) {
    var parent = elem.nodeType !== 1 ? elem.parentNode : elem
  //  console.log(parent)
    if (!parent)
        return
    val = val == null ? "" : val //不在页面上显示undefined null
    var vnode = addVnodeToData(parent, data)
 //   console.log(val, parent)
    updateVTree.text(vnode, parent, val, data)
    vnode.addTask("text", parent)

}
