
bindingExecutors.text = function (val, elem, data) {
    var parent = elem.nodeType !== 1 ? elem.parentNode : elem
    if (!parent)
        return
    val = val == null ? "" : val //不在页面上显示undefined null
    var vnode = addVnodeToData(parent, data)
    updateVTree.text(vnode, parent, val, data)
    vnode.addTask("text", parent)

}
