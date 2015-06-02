// bindingHandlers.html 定义在text.js
bindingExecutors.html = function (val, elem, data) {
    var parent = elem.nodeType !== 1 ? elem.parentNode : elem
    if (!parent)
        return
    val = val == null ? "" : val
    var fill = avalon.parseHTML(val)
    var nodes = avalon.slice(fill.childNodes)
    fillSignatures(parent, data, fill)
    scanNodeArray(nodes, data.vmodels)
//    var vnode = addVnodeToData(parent, data)
//    vnode.htmlValue = val
//    vnode.htmlData = data
//    vnode.addTask("html")
}