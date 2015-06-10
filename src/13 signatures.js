
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


function traverseNodeBetweenSignature(array, signature, callbacks) {
    var collect = false, comments = [], content = [], token
    callbacks = callbacks || {}
    for (var i = 0, el; el = array[i];i++ ) {
        if (!collect && el.nodeType === 8 && el.nodeValue.indexOf(signature) === 0) {
            comments.push(el)
            token = callbacks.token = el.nodeValue+":end"
            collect = true
            callbacks.begin && callbacks.begin(el, i)
            continue
        } else if (collect && el.nodeType === 8 && el.nodeValue === token) {
            comments.push(el)
            collect = false
            callbacks.end && callbacks.end(el, i)
            continue
        }
        if (collect) {
            content.push(el)
            callbacks.step && callbacks.step(el, i)
        }
    }
    return {
       comments: comments,
       content:content
    }
}
function appendPlaceholders(elem, data, replace) {
    //文本绑定与html绑定当elem为文本节点
    //或include绑定，当使用了data-duplex-replace辅助指令时
    //其左右将插入两个注释节点，自身被替换
    var parent = elem.parentNode
    if (parent.queryVID) {
        start = new VComment(data.signature)
        end = new VComment(data.signature + ":end")
    } else {
        var start = DOC.createComment(data.signature)
        var end = DOC.createComment(data.signature + ":end")
    }
   
    if (replace) {
        parent.insertBefore(start, elem)
        parent.replaceChild(end, elem)
        data.element = end
    } else {
        avalon.clearHTML(elem)
        elem.appendChild(start)
        elem.appendChild(end)
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