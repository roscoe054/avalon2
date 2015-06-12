//避免使用firstChild，nextSibling，previousSibling等属性，一是提高速度，二是兼容VTree
function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodes(nodes, vmodels, parent.getAttribute("data-vid"))
}

/**
 * 这个方法用于扫描一个真实DOM数组/虚拟DOM数组
 * 在第一个循环中，会将文本节点中
 * {{expr}}变而 <!--v-text.1.0:expr--><!--v-text.1.0:expr:end-->
 * {{expr|html}}变而 <!--v-html.1.0:expr--><!--v-html.1.0:expr:end-->
 * 并抽取成绑定对象，
 * 如果存在符合/^v\-[a-z]+[\.\d]+/的注释节点，也会抽取成绑定对象，
 * 在第二个循环中，将这些真实DOM转换为虚拟DOM，并添加到虚拟DOM树上
 * 然后执行刚才收集到的绑定对象，
 * 最后扫描刚才那个数组剩下的元素节点
 * 
 * @param {Array} nodes
 * @param {Array} vmodels
 * @param {String} pid
 * @returns {undefined}
 */

function scanNodes(nodes, vmodels, pid, mountIndex) {
    var bindings = []
    var firstChild = nodes[0] || {}
    var isVirtual = firstChild.isVirtual == true
    var doc = isVirtual ? VDOC : DOC //使用何种文档对象来创建各种节点
    var inDom = firstChild.parentNode && firstChild.parentNode.nodeType === 1
    var endComment = false //如果前面出现了<!--v-text-->，但还没有看到<!--v-text:end-->
    mountIndex = mountIndex || 0
    var parent
    // 包在<!--v-html-->与<!--v-html:end-->,<!--v-repeat-->与<!--v-repeat:end-->,
    // <!--v-include-->与<!--v-include:end--> 之间的节点会被忽略掉
    for (var i = 0, node; node = nodes[i]; i++) {
        switch (node.nodeType) {
            case 1:
                if (!endComment) {
                    if (isVirtual) {
                        node.setAttribute("data-vid", pid + "." + mountIndex)
                    }
                    node._mountIndex = mountIndex++
                }
                break
            case 3:
                //如果碰到{{text}},{{html}}
                if (rexpr.test(node.nodeValue)) {
                    var tokens = scanExpr(node.nodeValue)
                    var generatePlaceholders = false
                    outerLoop:
                            for (var t = 0, token; token = tokens[t++]; ) {
                        if (token.expr) {
                            generatePlaceholders = true
                            break outerLoop
                        }
                    }
                    if (generatePlaceholders) {//如果要生成占位用的注释节点
                        parent = parent || node.parentNode
                        pid = pid || buildVTree(parent)
                        var fragment = doc.createDocumentFragment()
                        for (t = 0; token = tokens[t++]; ) {
                            if (token.expr) {
                                var signature = "v-" + token.type + pid + "." + mountIndex
                                if (!endComment) {
                                    mountIndex++
                                }
                                token.signature = signature
                                signature += ":" + token.value + (token.filters ? "|" + token.filters.join("|") : "")
                                var start = doc.createComment(signature)
                                var end = doc.createComment(signature + ":end")
                                token.element = end
                                bindings.push(token)
                                fragment.appendChild(start)
                                fragment.appendChild(end)
                            } else {
                                fragment.appendChild(doc.createTextNode(token.value))
                            }
                        }
                        parent.replaceChild(fragment, node)
                    }
                }
                break
            case 8:
                //如果是<!--v-text--><!--v-html--><!--v-include--><!--v-repeat--><!--v-with-->
                var nodeValue = node.nodeValue //如果后端渲染时已经生成好注释节点
                if (nodeValue === endComment) { //<!--v-text:end-->
                    endComment = false
                } else if (rvtext.test(nodeValue)) {//<!--v-text-->
                    endComment = nodeValue + ":end"
                    var btype = nodeValue.slice(2, nodeValue.indexOf("."))
                    if (btype === "text" || btype == "html") {//以后考虑也把ms-if放进来
                        var content = nodeValue.replace(rvtext, function (a) {
                            signature = a
                            return ""
                        })
                        token = getToken(content)
                        token.element = node
                        token.signature = signature
                        token.type = btype
                        bindings.push(token)
                    }
                    mountIndex++
                }
                break
        }
    }

    if (bindings.length) {
        if (!isVirtual && inDom) { //将真实DOM转换虚拟DOM并添加到虚拟DOM树上
            var vparent = VTree.queryVID(parent.getAttribute("data-vid"))
            vparent.childNodes.length = 0
            var nodeIndex = 0
            endComment = false
            for (i = 0, node; node = parent.childNodes[i]; i++) {
                switch (node.nodeType) {
                    case 1:
                        if (!endComment) {
                            var vid = pid + "." + nodeIndex++
                            node.setAttribute("data-vid", vid)
                        }
                        var vnode = VDOC.createElement(node.tagName, vparent)
                        vnode.vid = vid
                        break
                    case 3:
                        vnode = VDOC.createTextNode(node.nodeValue)
                        vparent.appendChild(vnode)
                        break
                    case 8:
                        var nodeValue = node.nodeValue
                        if (endComment === nodeValue) {
                            endComment = false
                        } else if (rvtext.test(nodeValue)) {
                            endComment = nodeValue+":end"
                            nodeIndex++
                        }
                        vnode = VDOC.createComment(nodeValue)
                        vparent.appendChild(vnode)
                        break
                }
            }
        }
        executeBindings(bindings, vmodels)
    }
    for (i = 0; node = nodes[i++]; ) {
        scanElement(node, node.nodeType, vmodels)
    }
    return mountIndex
}
function scanElement(node, nodeType, vmodels) {
    if (nodeType === 1) {
        if (node.isVirtual) {
            scanVTag(node, vmodels)
        } else {
            scanTag(node, vmodels) //扫描元素节点
        }
        if (node.msCallback) {
            node.msCallback()
            node.msCallback = void 0
        }
    }
}

var rvtext = /^v\-[a-z]+([\.\d]+)/
//实现一个能选择文本节点的选择器
// tagName, vid@8