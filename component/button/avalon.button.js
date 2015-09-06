// avalon 1.3.6
/**
 * 
 * @cnName 按钮组件
 * @enName button
 * @introduce
 * <p>按钮组件提供丰富的样式、形式选择，除与bootstrap可用的button样式保持一致外，支持small、default、big、large四种尺寸，同时支持图标button，可以是仅有图标的button，图标在左边的button、图标在右边的button、两边都有图标的button，当然也支持图标组，有水平图标组、垂直图标组两种形式</p>
 */
define(["avalon", "css!./oniui-common.css", "css!./avalon.button.css"], function (avalon) {
    var baseClasses = ["oni-button", "oni-widget", "oni-state-default"]


    function createButton(element, options) {
        var buttonText,
                buttonClasses = baseClasses.concat(),
                iconText = false,
                icons = options.icon,
                corner = options.corner
        element.tabIndex = -1
        if (corner) {
            buttonClasses.push("oni-corner-all")
            if (corner = parseInt(corner)) {
                element.style.borderRadius = corner + "px"
            }
        }

        if (options.size) {
            buttonClasses.push("oni-button-" + options.size)
        }
        if (options.color) {
            buttonClasses.push("oni-button-" + options.color)
        }
        if (options.disabled) {
            buttonClasses.push("oni-state-disabled")
        }
        avalon(element).addClass(buttonClasses.join(" "))

        switch (options.type) {
            case "text":
                buttonText = "<span class='oni-button-text'>{{label|html}}</span>"
                break;
            case "labeledIcon":
                iconText = true
            case "icon":
                switch (options.iconPosition) {
                    case "left":
                        buttonText = "<i class='oni-icon oni-icon-left'>" +
                                icons.replace(/\\/g, "") + "</i>" +
                                "<span class='oni-button-text oni-button-text-right"
                                + (!iconText ? " oni-button-text-hidden" : "") + "'>{{label|html}}</span>"
                        break;
                    case "right":
                        buttonText = "<span class='oni-button-text oni-button-text-left" +
                                (!iconText ? " oni-button-text-hidden" : "") + "'>{{label|html}}</span>"
                                + "<i class='oni-icon oni-icon-right'>" + icons.replace(/\\/g, "") + "</i>"
                        break;
                    case "left-right":
                        var iconArr = icons && icons.split("-") || ["", ""],
                                iconLeft = iconArr[0],
                                iconRight = iconArr[1]
                        buttonText = "<i class='oni-icon oni-icon-left'>" +
                                iconLeft.replace(/\\/g, "") + "&nbsp;</i>" +
                                "<span class='oni-button-text oni-button-text-middle" +
                                (!iconText ? " oni-button-text-hidden" : "") + "'>{{label|html}}</span>" +
                                "<i class='oni-icon oni-icon-right'>&nbsp;" + iconRight.replace(/\\/g, "") + "</i>"
                        break;
                }
                break;
        }
        options.$$template = function () {
            return buttonText
        }
    }


    avalon.component("oni:button", {
        $init: function (options, element) {
            element.label = options.label
            createButton(element, options)
            function stop(event) {
                if (options.disabled) {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                }
            }
            var $element = avalon(element)
            var buttonWidth
            if (buttonWidth = parseInt(options.width)) {
                element.style.width = buttonWidth + "px"
            }
            $element.bind("mousedown", function (event) {
                stop(event)
                $element.addClass("oni-state-active")
            })
            $element.bind("mouseup", function (event) {
                stop(event)
                $element.removeClass("oni-state-active")
            })
            $element.bind("blur", function () {
                $element.removeClass("oni-state-active")
                $element.removeClass("oni-state-focus")
            })
            $element.bind("focus", function () {
                $element.addClass("oni-state-focus")
            })
        },
        $ready: function (vm, element) {
            if (element.label) {
                vm.label = element.label
            }
        },
        $slot: "label",
        type: "text", //@config 配置button的展示形式，仅文字展示，还是仅图标展示，或者文字加图标的展示方式，三种方式分别对应："text"、"icon"、"labeledIcon"
        iconPosition: "left", //@config 当type为icon或者labeledIcon时，定义icon在哪边，默认在text的左边，也可以配置为右边("right"),或者两边都有("left-right")
        icon: "", //@config  当type为icon或者labeledIcon时，定义展示icon的内容，本组件的icon是使用web font实现，当iconPosition为"left"或者"right"时，将icon的码赋给icon，当iconPosition为"left-right",将left icon与right icon的码以"-"分隔，比如data-button-icon="\&\#xf001;-\&\#xf06b;"
        size: "", //@config button有四个尺寸"small", "default", "big", "large"
        color: "", //@config 定义button的颜色，默认提供了"primary", "warning", "danger", "success", "info", "inverse", "default" 7中颜色，与bootstrap保持一致
        corner: true, //@config 设置是否显示圆角，可以布尔值或者Number类型，布尔只是简单的说明显示或者不显示，Number则在表示显示与否的同时，也是在指定圆角的大小，圆角默认是2px。
        style: "", // 用于定义button的展现形式，比如"flat" "glow" "rounded" "3D" "pill" 本组件，仅提供flat的实现
        disabled: false, //@config 配置button的禁用状态
        label: "", //@config 设置button的显示文字，label的优先级高于元素的innerHTML
        width: "" //@config 设置button的宽度，注意button的盒模型设为了border-box
    })

    avalon.component("oni:buttonset", {
        data: [],
        $init: function (options, element) {
            var data = options.data
            var buttons = ""
            options.corner = typeof options.corner === "boolean" ? options.corner : true
            data.forEach(function (button, index) {
                var buttonStr = "<oni:button"
                if (button.type !== void 0) {
                    buttonStr += " type='" + button.type + "'"
                }
                if (button.iconPosition !== void 0) {
                    buttonStr += " icon-position='" + button.iconPosition + "'"
                }
                if (button.icon !== void 0) {
                    buttonStr += " icon='" + button.icon + "'"
                }
                if (button.color !== void 0) {
                    buttonStr += " color='" + button.color + "'"
                }
                if (button.size !== void 0) {
                    buttonStr += " size='" + button.size + "'"
                }
                if (button.disabled !== void 0) {
                    buttonStr += " disabled='" + button.disabled + "'"
                }
                if (button.label !== void 0) {
                    buttonStr += " label='" + button.label + "'"
                }
                buttonStr += ">" + (button.text || "") + "</oni:button>"
                buttons += buttonStr
            })
            if (buttons) {
                options.$$template = function () {
                    return buttons
                }
            } else {
                options.$$template = false
            }
        },
        $buttons: [],
        monospace: true,
        direction: "",
        corner: void 0,
        width: NaN,
        $childReady: function (options, element, e) {
            var button = e.target
            options.$buttons.push(button)
            var $button = avalon(button)

            $button.removeClass("oni-corner-all")


            if (options.$$template && isFinite(options.width)) {
                button.style.width = (~~options.width -
                        parseInt($button.css("border-left-width")) -
                        parseInt($button.css("border-right-width")) -
                        parseInt($button.css("padding-left")) * 2) + "px"

            }

        },
        $ready: function (options, element) {
            var buttons = options.$buttons,
                    elementClass = [],
                    firstButtonClass = "oni-corner-left",
                    lastButtonClass = "oni-corner-right",
                    n = buttons.length,
                    buttonsetCorner = options.corner,
                    direction = options.direction,
                    $element = avalon(element)



            elementClass.push("oni-buttonset")
            avalon(buttons[0]).addClass("oni-button-first")
            if (n && buttonsetCorner) {

                if (direction === "vertical") {
                    firstButtonClass = "oni-corner-top"
                    lastButtonClass = "oni-corner-bottom"
                }
                avalon(buttons[0]).addClass(firstButtonClass)
                avalon(buttons[n - 1]).addClass(lastButtonClass)
            }
            if (direction === "vertical") {
                elementClass.push("oni-buttonset-vertical")

            }
            $element.addClass(elementClass.join(" "))
            if (options.monospace || direction === "vertical") {
                var widths = []
                for (var i = 0, button; button = buttons[i++]; ) {
                    widths.push(avalon(button).outerWidth() + 1)
                }
                var maxWidth = Math.max.apply(Math, widths)

                for (i = 0; button = buttons[i++]; ) {

                    var $button = avalon(button)
                    button.style.width = (maxWidth
                            - parseInt($button.css("border-left-width"))
                            - parseInt($button.css("border-right-width"))
                            - parseInt($button.css("padding-left")) * 2) + "px"

                }

            }
        }

    })

    return avalon
})
/**
 @links
 [设置button的大小、宽度，展示不同类型的button](avalon.button.ex1.html)
 [设置button的width和color](avalon.button.ex2.html)
 [通过ms-widget="button, $, buttonConfig"的方式设置button组](avalon.button.ex3.html)
 [通过ms-widget="buttonset"的方式设置button](avalon.button.ex4.html)
 */
