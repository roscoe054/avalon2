// bindingHandlers.html 定义在text.js
bindingExecutors.html = function (val, elem, data) {
    var parent = elem.nodeType !== 1 ? elem.parentNode : elem
    if (!parent)
        return
    val = val == null ? "" : val

    if (typeof val !== "object") {//string, number, boolean
        var fragment = avalon.parseHTML(String(val))
    } else if (val.nodeType === 11) { //将val转换为文档碎片
        fragment = val.childNodes
    } else if (val.nodeType === 1 || val.item) {
        var nodes = val.nodeType === 1 ? val.childNodes : val.item
        fragment = hyperspace.cloneNode(true)
        while (nodes[0]) {
            fragment.appendChild(nodes[0])
        }
    }
    var vnode = addVnodeToData(parent, data)
    updateVTree.html(vnode, parent, fragment, data)
//    scanNodeArray(nodes, data.vmodels)
    vnode.addTask("html")
}