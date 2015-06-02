// bindingHandlers.text 定义在if.js
bindingExecutors.text = function (val, elem, data) {
    val = val == null ? "" : val //不在页面上显示undefined null
    var vnode = addVnodeToData(elem, data)
    if (vnode.nodeType === 3) { //绑定在文本节点上
        vnode.nodeValue = val
        vnode.parentNode.addTask("textFilter")
    } else { //绑定在特性节点上
        vnode.setText(val)
        vnode.addTask("text")
    }
   
}

function addVnodeToData(elem, data) {
    if (data.vnode) {
        return data.vnode
    } else if (elem.nodeType === 1) {
        var vid = getUid(elem)
        var vnode = VTree.queryVID(vid)
        if (!vnode) {
            vnode = new VElement(elem, VTree)
        }
        return data.vnode = vnode
    } else {
        var vid = getUid(elem.parentNode)
        var vparent = VTree.queryVID(vid)
        var index = getTextOrder(elem, elem.parentNode)
        console.log(index)
        return data.vnode = vparent.childNodes[index]
    }
}