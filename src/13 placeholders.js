
//处理路标系统的三个重要方法
function getPlaceholders(elem, signature) {
    var comments = []
    for (var i = 0, el; el = elem.childNodes[i++]; ) {
        if (el.nodeType === 8 && el.nodeValue.indexOf(signature) === 0) {
            comments.push(el)
        }
    }
    return comments
}
function updateNodesBetweenPlaceholders(virtuals, parent, index, placeholder) {
    var nodes = [], collect, end
    for (var i = index, node; node = parent.childNodes[i]; i++) {
        if (!collect && node.nodeType === 8 && node.nodeValue === placeholder) {
            collect = true
            continue
        } else if (collect && node.nodeType === 8 && node.nodeValue === placeholder + ":end") {
            end = node
            break
        }
        if (collect) {
            nodes.push(node)
        }
    }

    updateNodesBetweenPlaceholdersImpl(nodes, virtuals, parent, end)
    return i - virtuals.length + 1
}

function updateNodesBetweenPlaceholdersImpl(nodes, virtuals, parent, end) {
    for (var i = 0, node; node = virtuals[i]; i++) {
        var real = nodes.shift();
        if (!real) {
            //如果真空DOM树中的相应位置只有占位符，或者真实DOM的个数比虚拟DOM少，那么就直接创建添加
            parent.insertBefore(new DNode(node), end || null)
        } else if (real.nodeType !== node.nodeType) {
            //如果类型不相同，那么直接创建替换
            parent.replaceChild(new DNode(node), real)
        } else {
            switch (node.nodeType) {
                case 1:
                    //如果类型相同，tagName不同，或不是同一种表单元素，就创建替换
                    if (real.nodeName !== node.nodeName ||
                            (real.nodeName === "INPUT" && real.type !== node.type)) {
                        //SPAN !== B 或 input[type=text] !== input[type=password]
                        parent.replaceChild(new DNode(node), real)
                    } else {
                        //如果类型相同，就比较元素
                        updateNodesBetweenPlaceholdersImpl(avalon.slice(real.childNodes), node.childNodes, real, real.lastChild)
                    }
                    break
                default://直接刷新nodeValue
                    if (real.nodeValue !== node.nodeValue) {
                        real.nodeValue = node.nodeValue
                    }
            }
        }
    }
    if (nodes.length) {
        while (node = nodes.shift()) {
            parent.removeChild(node)
        }
    }
}

function appendPlaceholders(elem, data, replace) {
    //文本绑定与html绑定当elem为文本节点
    //或include绑定，当使用了data-duplex-replace辅助指令时
    //其左右将插入两个注释节点，自身被替换
    var doc = elem.isVirtual === true ? VDOC : DOC
    var start = doc.createComment(data.signature)
    var end = doc.createComment(data.signature + ":end")
    var target = replace ? elem.parentNode : target
    if (replace) {
        data.element = end
        target.insertBefore(start, elem)
        target.replaceChild(end, elem)
    } else {
        avalon.clearHTML(target)
        target.appendChild(start)
        target.appendChild(end)
    }

    if (!target.isVirtual) {
        var pid = buildVTree(target)
        var vnode = VTree.queryVID(pid)
        vnode.childNodes.length = 0
        vnode.appendChild((new VNode(target)).childNodes)
    }

    return [start, end]
}

function fillPlaceholders(elem, data, fill, callback) {
    var comments = getPlaceholders(elem, data.signature)
    callback = callback || function () {
    }
    //移除两个注释节点间的节点
    //console.log(comments)
    if (!comments.length) {
        log(data.signature + "!找不到元素")
        return
    }
    var index = indexElement(comments[0], elem.childNodes) //avalon.slice(elem.childNodes).indexOf(comments[0])
    while (true) {
        var node = elem.childNodes[index + 1]
        if (node && node !== comments[1]) {
            elem.removeChild(node)
            callback(node, comments[0], comments[1])
        } else {
            break
        }
    }

    elem.insertBefore(fill, comments[1])
}

function indexElement(target, array) {
    for (var i = 0, el; el = array[i]; i++) {
        if (el === target)
            return i
    }
    return -1
}