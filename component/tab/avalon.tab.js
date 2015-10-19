/**
 * @cnName tab组件
 * @enName tab
 * @introduce
 *  <p> 实现扫描DOM结构或者接受数组传参，生成tab，支持click、mouseenter事件响应切换，支持mouseenter情形延迟响应切换，支持click情形tab选中情况下再次点击回调，支持自动切换效果，支持tab增删禁用启用并可混合设置同步tab可删除状态，支持混合配制panel内容类型并支持panel内容是ajax配置回调，注意扫描dom情形下，会销毁原有的dom，且会忽略所有的ol，ul，li元素上原有的绑定
 </p>
 */
define(["avalon", "text!./avalon.tab.html",
    "text!./avalon.tab.close.html",
    "css!./avalon.tab.css",
    "css!../chameleon/oniui-common.css"], function (avalon, template, closeTpl) {

// 对模板进行转换
    function _getTemplate(tpl, vm) {
        return tpl.replace(/MS_OPTION_(\w+)/g, function (a, b) {
            var word = b.toLowerCase()
            try {
                if (word === "event") {
                    return "on-" + vm.event
                }
                if (word === "removable") {
                    return vm[word] ? closeTpl : ""
                }
            } catch (e) {
            }
            return ""
        })
    }


    var _interface = avalon.noop
    avalon.component("oni:tabs", {
        $skipArray: ["tab"],
        tabs: [],
        tab: "",
        tabpanels: [],
        sliderIndex: 0,
        sliderLength: 0,
        nextEnable: 0,
        prevEnable: 0,
        _computedMarginLeft: "",
        target: "_blank", //@config tab item链接打开的方式，可以使_blank,_self,_parent
        toggle: true, //@config 组件是否显示，可以通过设置为false来隐藏组件
        autoSwitch: false, //@config 是否自动切换，默认否，如果需要设置自动切换，请传递整数，例如200，即200ms
        active: 0, //@config 默认选中的tab，默认第一个tab，可以通过动态设置该参数的值来切换tab，并可通过vmodel.tabs.length来判断active是否越界
        shallPanelAlwaysShow: false, //@config shallPanelAlwaysShow() panel不通过display:none,block来切换，而是一直显示，通过其他方式切换到视野，默认为false
        event: "mouseenter", //@config  tab选中事件，默认mouseenter
        removable: false, //@config  是否支持删除，默认否，另外可能存在某些tab可以删除，某些不可以删除的情况，如果某些tab不能删除则需要在li元素或者tabs数组里给对应的元素指定removable : false，例如 li data-removable="false" or {title: "xxx", removable: false}
        preScanPannel: false, //@config 是否需要先扫面元素，再创建widget，默认否
        activeDelay: 0, //@config  比较适用于mouseenter事件情形，延迟切换tab，例如200，即200ms
        collapsible: false, //@config  当切换面板的事件为click时，如果对处于激活状态的按钮再点击，将会它失去激活并且对应的面板会收起来,再次点击它时，它还原，并且对应面板重新出现
        contentType: "content", //@config  panel是静态元素，还是需要通过异步载入，还可取值为ajax，但是需要给对应的panel指定一个正确的ajax地址
        bottom: false, //@config  tab显示在底部
        dir: "h", //@config  tab排列方向，横向或纵向v - vertical，默认横向h - horizontal
        callInit: true, //@config  是否调用即初始化
        titleCutCount: 8, //@config  tab title截取长度，默认是8
        distroyDom: true, //@config  扫描dom获取数据，是否销毁dom
        cutEnd: "...", //@config  tab title截取字符后，连接的字符，默认为省略号
        sliderStep: "100%", //@config  点击slider箭头移动的距离
        forceCut: false,
        onInit: _interface,
        onActivate: _interface, //@config onActivate(event, vmode) 选中tab后的回调，this指向对应的li元素，参数是事件对象，vm对象 fn(event, vmode)，默认为avalon.noop
        onClickActive: _interface, //@config onClickActive(event, vmode)  点击选中的tab，适用于event是"click"的情况，this指向对应的li元素，参数是事件对象，vm对象 fn(event, vmode)，默认为avalon.noop
        onAjaxCallback: _interface, //@config onAjaxCallback  panel内容是ajax，ajax响应后的回调函数，this指向对应的panel元素，无参数，默认为空函数
        add: _interface,
        //@interface remove(e, index) 删除索引指向的tab，绑定情形下ms-click="remove($event, index)"，js调用则是vm.remove(index)
        remove: _interface,
        //@interface activate(index) 选中tab
        activate: _interface,
        //@interface disable(index) 禁用索引指向的tab，index为数字或者元素为数字的数组
        disable: _interface,
        enable: _interface,
        buttonEnable: _interface,
        computeSlider: _interface,
        _clearTimeout: _interface,
        _canRemove: _interface,
        _canActive: _interface,
        _isAjax: _interface,
        _cutCounter: _interface,
        _shallPanelAlwaysShow: _interface,
        // 自动切换效果
        _autoSwitch: _interface,
        $template: template,
        $construct: function (a, b, c) {
            return avalon.mix(a, b, c)
        },
        _tabTitle: _interface,
        $init: function (vm, elem) {
            vm.$template = vm.$$template(vm.$template)

            vm.$$template = false
            // 选中tab
            vm.activate = function (event, index, fix) {
                // 猥琐的解决在ie里面报找不到成员的bug
                // !fix && event.preventDefault()
                if (vm.tabs[index].disabled === true) {
                    if (vm.event === "click")
                        event.preventDefault()
                    return
                }
                if (vm.tabs[index].linkOnly) {
                    return
                }
                var el = this
                // event是click，点击激活状态tab
                if (vm.event === "click" && vm.active === index) {
                    // 去除激活状态
                    if (vm.collapsible) {
                        vm.active = NaN
                        event.preventDefault()
                        // 调用点击激活状态tab回调
                    } else {
                        if (!vm.onClickActive.call(el, event, vm))
                            event.preventDefault()
                    }
                    return
                }
                if (vm.event === "click")
                    event.preventDefault()
                if (vm.active !== index) {
                    vm.active = index
                    vm.onActivate.call(el, event, vm)
                }
            }
            // 延迟切换效果
            if (vm.event == "mouseenter" && vm.activeDelay) {
                var timer
                        , tmp = vm.activate
                vm.activate = function ($event, $index) {
                    clearTimeout(timer)
                    var el = this
                            , arg = arguments
                    timer = setTimeout(function () {
                        tmp.apply(el, [$event, $index, "fix event bug in ie"])
                    }, vm.activeDelay)
                    if (!el.getAttribute("leave-binded") && 0) {
                        el.setAttribute("leave-binded", 1)
                        avalon.bind(el, "mouseleave", function () {
                            clearTimeout(timer)
                        })
                    }
                }
            }
            // 修改使用了avalon的几个方法
            //@interface disable(index) 禁用索引指向的tab，index为数字或者元素为数字的数组
            vm.disable = function (index, disable) {
                disable = disable == void 0 ? true : disable
                if (!(index instanceof Array)) {
                    index = [index]
                }
                var total = vm.tabs.length
                avalon.each(index, function (i, idx) {
                    if (idx >= 0 && total > idx) {
                        vm.tabs[idx].disabled = disable
                    }
                })
            }
            //@interface enable(index) 启用索引指向的tab，index为数字或者元素为数字的数组
            vm.enable = function (index) {
                vm.disable(index, false)
            }
            vm.buttonEnable = function () {
                if (vm.sliderLength > 1) {
                    vm.prevEnable = true
                    vm.nextEnable = true
                } else {
                    vm.prevEnable = false
                    vm.nextEnable = false
                }
            }
            //@interface add(config) 新增tab, config = {title: "tab title", removable: bool, disabled: bool, content: "panel content", contentType: "ajax" or "content"}
            vm.add = function (config) {
                var title = config.title || "Tab Tile"
                var content = config.content || "<div></div>"
                var exsited = false
                vm.tabpanels.forEach(function (panel) {
                    if (panel.contentType == "include" && panel.content == config.content) {
                        exsited = true
                    }
                })
                if (exsited === true) {
                    return
                }
                vm.tabpanels.push({
                    content: content,
                    contentType: config.contentType
                })
                vm.tabs.push({
                    title: title,
                    removable: config.removable,
                    disabled: false
                })
                if (config.actived) {
                    avalon.nextTick(function () {
                        vm.active = vm.tabs.length - 1
                    })
                }
            }
            vm.remove = function (e, index) {
                if (arguments.length == 2) {
                    e.preventDefault()
                    e.stopPropagation()
                } else {
                    index = e
                }
                if (vm.tabs[index].disabled === true || vm.tabs[index].removable === false ||
                        vm.tabs[index].removable == void 0 && !vm.removable) {
                    return
                }
                vm.tabs.removeAt(index)
                vm.tabpanels.removeAt(index)
                index = index > 1 ? index - 1 : 0
                avalon.nextTick(function () {
                    vm.active = index
                })
                //  vm.bottom = options.bottom
            }
            vm.slider = function ($event, dir) {
                $event.preventDefault()
                var step
                if (dir === "prev") {
                    step = vm.sliderIndex - 1
                    step = step > 0 ? step : 0
                } else {
                    step = vm.sliderIndex + 1
                }

                vm.sliderIndex = step

                var tabs = document.getElementById("tabs" + vm.tabs.$id)
                var tabsWidth = tabs.scrollWidth,
                        containerWidth = avalon(tabs.parentNode.parentNode).width(),
                        tabsMargin = avalon(tabs.parentNode).css("margin-left")

                var maxMarginLeft = tabsWidth - containerWidth

                if (vm.sliderStep.indexOf("%") !== -1) {
                    vm._computedMarginLeft = vm.sliderIndex * parseInt(vm.sliderStep, 10) * containerWidth * 0.01
                } else if (vm.sliderStep.indexOf("px") !== -1) {
                    vm._computedMarginLeft = vm.sliderIndex * parseInt(vm.sliderStep, 10)
                } else {
                    avalon.log("ERROR: sliderStep设置有误")
                }

                // 判断tabs是否达到最右侧
                if ((vm._computedMarginLeft) > maxMarginLeft) {
                    vm._computedMarginLeft = -maxMarginLeft + "px"
                } else {
                    vm._computedMarginLeft = -vm._computedMarginLeft + "px"
                }

                // 如果不再移动了，则sliderIndex不变化
                if (dir === "next" && tabsMargin === vm._computedMarginLeft) {
                    vm.sliderIndex -= 1
                }

                vm.computeSlider()
                vm.buttonEnable()
            }
            vm.computeSlider = function () {
                if (vm.dir === "v")
                    return
                var tabs = document.getElementById("tabs" + vm.tabs.$id)
                if (tabs) {
                    setTimeout(function () {

                        var tabsWidth = tabs.scrollWidth,
                                containerWidth = avalon(tabs.parentNode.parentNode).width(),
                                tabsMargin = avalon(tabs.parentNode).css("margin-left")

                        // fix slider状态下删除tab对布局的影响
                        if (tabsWidth < containerWidth) {
                            vm._computedMarginLeft = 0
                        } else if (tabsWidth < containerWidth - parseInt(tabsMargin)) {
                            vm._computedMarginLeft = -(tabsWidth - containerWidth) + "px"
                        }

                        if (tabsWidth > containerWidth) {
                            vm.sliderLength = tabsWidth / containerWidth
                        } else {
                            vm.sliderLength = 0
                        }

                        vm.buttonEnable()

                    }, 0)
                }
            }
            var switchTimer
            vm._clearTimeout = function () {
                clearTimeout(switchTimer)
            }
            vm._canRemove = function (tab) {
                return (tab.removable == true || tab.removable !== false && vm.removable) && !tab.disabled && vm.dir != "v"
            }

            vm._canActive = function (tab, $index) {
                return vm.active == $index && !tab.disabled
            }


            vm._isAjax = function (panel) {
                return vm.contentType === "content" && !panel.contentType || panel.contentType === "content"
            }
            vm._cutCounter = function () {
                return (vm.dir === "h" || vm.forceCut) && vm.titleCutCount
            }
            vm._shallPanelAlwaysShow = function ($index) {
                return vm.shallPanelAlwaysShow || $index === vm.active
            }
            vm._tabTitle = function (title, tab, count, end) {
                var cut
                if (tab.titleCutCount != void 0) {
                    cut = tab.titleCutCount
                } else if (count != void 0) {
                    cut = count
                }
                if (!cut)
                    return title
                var visibleTitle = title.split(/<[^>]+>/g)
                        , len = 0
                        , res = 0
                        , indexToIgnore
                avalon.each(visibleTitle, function (i, item) {
                    if (indexToIgnore >= 0) {
                        res = ""
                    } else {
                        var s = item.trim()
                        if (len + s.length > cut) {
                            indexToIgnore = i
                            res = s.substr(0, cut - len) + end
                        } else {
                            len += s.length
                            res = 0
                        }
                    }
                    if (res === 0)
                        return
                    title = title.replace(item, res)
                })
                return title

            }
            // 自动切换效果
            vm._autoSwitch = function () {
                clearTimeout(switchTimer)
                if (vm.tabs.length < 2)
                    return
                switchTimer = setTimeout(function () {
                    var i = vm.active + 1
                            // 防止死循环
                            , loop = 0
                    while (i != vm.active && loop < vm.tabs.length - 1) {
                        if (i >= vm.tabs.length) {
                            i = 0
                        }
                        if (!vm.tabs[i].disabled) {
                            vm.active = i
                            vm._autoSwitch()
                            break
                        }
                        i++
                        loop++
                    }
                }, vm.autoSwitch)
            }
            if (vm.autoSwitch) {

                avalon.bind(elem, "mouseenter", function () {
                    vm._clearTimeout()
                })
                avalon.bind(elem, "mouseleave", function () {
                    vm._clearTimeout()
                    vm._autoSwitch()
                })
                vm.$watch("autoSwitch", function (value, oldValue) {
                    vm._clearTimeout()
                    if (value) {
                        vm._autoSwitch()
                    }
                })
            }
            vm.onInit(vm)
        },
        //收集<div slot='tab'>上面的数据
        collectData: function (vm, elem) {
            vm.tabs.push({
                title: elem.title || "notitle",
                removable: !!elem.getAttribute("removable"),
                linkOnly: !!elem.getAttribute("link-only"),
                target: !!elem.getAttribute("target") || "_self",
                disabled: elem.getAttribute("disabled") === "true",
                href: elem.getAttribute("href")
            })

            vm.tabpanels.push({
                content: elem.innerHTML,
                contentType: elem.getAttribute("content-type") || "content"
            })
        },
        $childReady: function (vm, elem, e) {
            console.log(elem.innerHTML)
            vm.tabs.push({
                title: elem.title || "notitle",
                removable: !!elem.getAttribute("removable"),
                linkOnly: !!elem.getAttribute("link-only"),
                target: !!elem.getAttribute("target") || "_self",
                disabled: elem.getAttribute("disabled") === "true",
                href: elem.getAttribute("href")
            })

            vm.tabpanels.push({
                content: elem.innerHTML,
                contentType: elem.getAttribute("content-type") || "content"
            })
            vm.$refs[e.vm.$id] = e.vm
        },
        $ready: function (vm, elem, vs) {
            if (vm.tab && vm.tab.nodeType === 11) {
                for (var i = 0, node; node = vm.tab.childNodes[i++]; ) {
                    if (node.nodeType === 1) {
                        vm.collectData(vm, node)
                    }
                }
                vm.tab = ""
            }

            vm.active = vm.active >= vm.tabs.length && vm.tabs.length - 1 ||
                    vm.active < 0 && 0 || parseInt(vm.active) >> 0

            avalon(elem).addClass("oni-tab oni-widget oni-widget-content" +
                    (vm.event === "click" ? " oni-tab-click" : "") + (vm.dir === "v" ?
                    " oni-tab-vertical" : "") + (vm.dir != "v" && vm.uiSize === "small" ? " oni-tab-small" : ""))
            // tab列表
            var string = vm.$template
            var arr = string.split("MS_OPTION_SPLIT")
            var tabFrag = _getTemplate(arr[0], vm);
            var panelFrag = _getTemplate(arr[1] || "", vm)
            elem.innerHTML = vm.bottom ? panelFrag + tabFrag : tabFrag + panelFrag
            avalon.scan(elem, [vm].concat(vs))
            if (vm.autoSwitch) {
                vm._autoSwitch()
            }

        }
    })

    return avalon
})
/*
 <oni:tabs class="tabs-positive tabs-icon-only">
 
 <oni:tab title="Home" slot="tab" >
 <!-- Tab 1 content -->
 </oni:tab>
 
 <oni:tab title="About" slot="tab">
 <!-- Tab 2 content -->
 </oni:tab>
 
 <oni:tab title="Settings" slot="tab">
 <!-- Tab 3 content -->
 </oni:tab>
 
 </oni:tabs>
 */