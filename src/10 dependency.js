/*********************************************************************
 *                           依赖调度系统                             *
 **********************************************************************/
//检测两个对象间的依赖关系
var dependencyDetection = (function () {
    var outerFrames = []
    var currentFrame
    return {
        begin: function (binding) {
            //accessorObject为一个拥有callback的对象
            outerFrames.push(currentFrame)
            currentFrame = binding
        },
        end: function () {
            currentFrame = outerFrames.pop()
        },
        collectDependency: function (array) {
            if (currentFrame) {
                //被dependencyDetection.begin调用
                currentFrame.callback(array)
            }
        }
    };
})()
//将绑定对象注入到其依赖项的订阅数组中
var ronduplex = /^(duplex|on)$/
function returnTrue(){
    return true
}
avalon.injectBinding = function (data) {
    var valueFn =  ronduplex.test(data.type) ? returnTrue : data.evaluator
    
    if (valueFn) { //如果是求值函数
        dependencyDetection.begin({
            callback: function (array) {
                injectDependency(array, data)
            }
        })
        try {
            data.update = function () {
                var value = valueFn.apply(0, data.args)
                if (data.xtype && value === void 0) {
                    delete data.evaluator
                }
                
                if (data.oldValue !== value) {
                    data.handler(value, data.element, data)
                    data.oldValue = data.xtype === "array" ? value.concat():
                            data.xtype === "object" ? avalon.mix({}, value):
                            value
                }
            }
            data.update()
        } catch (e) {
            log(e)
            //  log("warning:exception throwed in [avalon.injectBinding] " + e)
            delete data.evaluator
            delete data.update
            var node = data.element
            if (node.nodeType === 3) {
                var parent = node.parentNode
                if (kernel.commentInterpolate) {
                    parent.replaceChild(DOC.createComment(data.value), node)
                } else {
                    node.data = openTag + (data.oneTime ? "::" : "") + data.value + closeTag
                }
            }
        } finally {
            dependencyDetection.end()
        }
    }
}

//将依赖项(比它高层的访问器或构建视图刷新函数的绑定对象)注入到订阅者数组 
function injectDependency(list, data) {
    if (data.oneTime)
        return
    if (list && avalon.Array.ensure(list, data) && data.element) {
        //  injectDisposeQueue(data, list)
    }
}

