// bindingHandlers.html 定义在if.js
bindingExecutors.html = function (val, elem, data) {
    var parent = elem.nodeType !== 1 ? elem.parentNode : elem
    if (!parent)
        return
    if (!data.signature) {
        var signature = data.signature = generateID("v-html")
        var start = DOC.createComment(signature)
        var end = DOC.createComment(signature + ":end")
        if (elem.nodeType === 1) {//ms-html
            avalon.clearHTML(elem)
            elem.appendChild(start)
            elem.appendChild(end)
        } else {//{{expr|html}}
            parent.insertBefore(start, elem)
            parent.replaceChild(end, elem)
            data.element = end
        }
    }
    var vnode = addVnodeToData(parent, data)
    val = val == null ? "" : val
    vnode.htmlValue = val
    vnode.htmlData = data
    vnode.addTask("html")
}