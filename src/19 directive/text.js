// bindingHandlers.text 定义在if.js
bindingExecutors.text = function (val, elem, data) {
    val = val == null ? "" : val //不在页面上显示undefined null
    addVNodeInData(elem, data)
    var vnode = data.vnode
    if (vnode.nodeType === 3) { //绑定在文本节点上
       vnode.nodeValue = val
//        try { //IE对游离于DOM树外的节点赋值会报错
//            elem.data = val
//        } catch (e) {
    } else { //绑定在特性节点上
        vnode.setText(val)
//        if ("textContent" in elem) {
//            elem.textContent = val
//        } else {
//            elem.innerText = val
//        }
    }
    globalRender()
}