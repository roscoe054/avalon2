// avalon 1.3.6
/**
 * 
 * @cnName 对话框
 * @enName dialog
 * @introduce
 *    <p>dialog组件提供弹窗显示或者隐藏,通过简单配置可以水平居中显示dialog弹窗，此组件支持弹窗中再弹窗，也可以用来模拟alert的行为，非常方便</p>
 */
define([
    "avalon",
    "text!./avalon.dialog.html",
    "../button/avalon.button",
    "css!./oniui-common.css",
    "css!./avalon.dialog.css",
], function (avalon, template) {
    var _interface = function () {
    }
    var maskLayerExist = false, // 页面不存在遮罩层就添加maskLayer节点，存在则忽略
            maskLayer = avalon.parseHTML('<div class="oni-dialog-layout"></div>').firstChild,
            maskLayerShim, //一个iframe,用于处理IE6select BUG 
            dialogShows = [], //存在层上层时由此数组判断层的个数
            dialogNum = 0 //保存页面dialog的数量，当dialogNum为0时，清除maskLayer
    avalon.component("oni:dialog", {
        $template: template,
        width: 480, //@config 设置dialog的width
        title: "&nbsp;", //@config 设置弹窗的标题
        draggable: false, //@config 设置dialog是否可拖动
        type: "confirm", //@config 配置弹窗的类型，可以配置为alert来模拟浏览器
        content: "", //@config 配置dialog的content，默认取dialog的innerHTML作为dialog的content，如果innerHTML为空，再去取content配置项.需要注意的是：content只在初始化配置的起作用，之后需要通过setContent来动态的修改
        //@config配置dialog是否显示"取消"按钮，但是如果type为alert，不论showClose为true or false都不会显示"取消"按钮
        showClose: true,
        $skipArray: ["container"],
        toggle: true, //@config 通过此属性的决定dialog的显示或者隐藏状态
        widgetElement: "", //@config 保存对绑定元素的引用
        container: "body", //@config dialog元素的上下文父元素，container必须是dialog要appendTo的父元素的id或者元素dom对象
        confirmText: "确定", //@config 配置dialog的"确定"按钮的显示文字
        cancelText: "取消", //@config 配置dialog的"取消"按钮的显示文字
        position: /MISE 6/.test(navigator.userAgent) ? "absolute" : "fixed",
        /**
         * @config {Function} 定义点击"确定"按钮后的回调操作
         * @param event {Number} 事件对象
         * @param vmodel {Object} 组件对应的Vmodel
         * @returns {Boolean} 如果return false，dialog不会关闭，用于异步操作
         */
        onConfirm: _interface,
        /**
         * @config {Function} 定义显示dialog时的回调
         * @param vmodel {Object} 组件对应的Vmodel
         */
        onOpen: _interface,
        /**
         * @config {Function} 定义点击"取消"按钮后的回调操作
         * @param event {Object} 事件对象
         * @param vmodel {Object} 组件对应的Vmodel
         * @returns {Boolean} 如果return false，dialog不会关闭，用于异步操作
         */
        onCancel: _interface,
        /**
         * @config {Function} 定义点击"关闭"按钮后的回调操作
         * @param event {Object} 事件对象
         * @param vmodel {Object} 组件对应的Vmodel
         */
        onClose: _interface, //点击右上角的“关闭”按钮的回调
        //@config 动态修改dialog的title,也可通过dialogVM.title直接修改
        setTitle: _interface,
        setContent: _interface,
        /**
         * @config {Function} 重新渲染模板
         * @param m {Object} 重新渲染dialog的配置对象，包括title、content、content中涉及的插值表达式，需要注意的是，title和content不是真正渲染的内容，所以不需要avalon进行扫描监控，定义的时候必须在其前面加上"$",否则组件不会渲染成想要的效果
         */
        setModel: _interface,
        $construct: function (a, b, c) {
            var options = avalon.mix(a, b, c)
            options.confirmText = options.confirmText || options.confirmName
            options.cancelText = options.cancelText || options.cancelName
            var $container = options.$container || options.container
            options.$container = $container && $container.nodeType === 1 ? $container : document.body
            delete options.confirmName
            delete options.cancelName
            delete options.container
            return options
        },
        $init: function (vm, element) {
            vm.widgetElement = element
            dialogShows.push(element)
            //  var conc
            avalon(element).addClass("oni-dialog")
            //  element.setAttribute("ms-visible", "toggle")
            element.setAttribute("ms-css-position", "position")



            vm._open = function (updateZIndex) {
                var len = 0, //当前显示的dialog的个数
                        selectLength = document.getElementsByTagName("select").length

                avalon.Array.ensure(dialogShows, element)
                len = dialogShows.length
                if (len) {
                    if (vm.modal) {
                        avalon(maskLayer).css("display", "block")
                    }
                   // avalon(maskLayerSimulate).css("display", "block")
                }
                // 通过zIndex的提升来调整遮罩层，保证层上层存在时遮罩层始终在顶层dialog下面(顶层dialog zIndex-1)但是在其他dialog上面
                adjustZIndex(element)
           
                document.documentElement.style.overflow = "hidden"
                resetCenter(vm, element)
                // IE6下遮罩层无法覆盖select解决办法
                if (isIE6 && selectLength && iFrame === null && vmodel.modal) {
                    iFrame = createIframe()
                } else if (isIE6 && selectLength && vmodel.modal) {
                    iFrame.style.display = "block"
                    iFrame.style.width = maskLayer.style.width
                    iFrame.style.height = maskLayer.style.height
                    iFrame.style.zIndex = maskLayer.style.zIndex - 1
                }
                vmodel.onOpen.call(element, vmodel)
            }



        },
        $ready: function (vm, element) {

            resetCenter(vm, element)
            element.parentNode.insertBefore(maskLayer, element)
            getMaxZindex(element)

        },
        modal: true, //@config 是否显示遮罩
        zIndex: 0, //@config 通过设置vmodel的zIndex来改变dialog的z-index,默认是body直接子元素中的最大z-index值，如果都没有设置就默认的为10
        zIndexIncrementGlobal: 0 //@config 相对于zIndex的增量, 用于全局配置，如果只是作用于单个dialog那么zIndex的配置已足够，设置全局需要通过avalon.ui.dialog.defaults.zIndexIncrementGlobal = Number来设置
    })

    function adjustZIndex(elem) {
        var nodes = elem.parentNode.children
        var zindexes = []
        for (var i = 0, el; el = nodes[i++]; ) {
            if (el !== elem && el !== maskLayer) {
                zindexes.push(~~avalon.css(el, "zIndex"))
            }
        }
        var max = Math.max.apply(0, zindexes)
        avalon(maskLayer).css("z-index", max + 1)
        avalon(elem).css("z-index", max + 2)
    }










    // 使dialog始终出现在视窗中间
    function resetCenter(vmodel, target) {


        if (!vmodel.toggle)
            return

        var windowWidth = avalon(window).width()
        var windowHeight = avalon(window).height()
        var scrollTop = document.body.scrollTop + document.documentElement.scrollTop
        var scrollLeft = document.documentElement.scrollLeft

        var dialogWidth = target.offsetWidth
        var dialogHeight = target.offsetHeight

        var top = Math.max((windowHeight - dialogHeight) / 2 + scrollTop, 0)
        var left = Math.max((windowWidth - dialogWidth) / 2 + scrollLeft, 0)
        console.log(top, left)

        for (var i = 0, el; el = dialogShows[i++]; ) {
            el.style.display = "block"
        }
        avalon(target).css({"top": top, "left": left})
        avalon(maskLayer).css({
            height: windowHeight,
            width: windowWidth,
            position: "absolute",
            top: 0,
            left: 0
        })

    }



    function createIframe() {
      return document.createElement('<iframe src="javascript:\'\'" '+
                'style="position:absolute;top:0;left:0;bottom:0;margin:0;padding:0;right:0;zoom:1;"></iframe>')
       
    }



})