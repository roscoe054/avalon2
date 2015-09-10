/**
 *
 * @cnName 具有提示功能的输入框
 * @enName textbox
 * @introduce
 * <p>通过给简单的表单输入域设置不同的配置项可以使表单拥有舒服的视觉效果，也可以使其具有提示补全功能</p>
 */
define(["avalon",
    "text!./avalon.textbox.html",
    "css!../chameleon/oniui-common.css",
    "css!./avalon.textbox.css"], function(avalon, template) {

    var _interface = function () {}

    avalon.component("oni:textbox", {
        // 内部变量
        _placeholderVisible: true,
        _focusing: false,
        _hovering: false,

        // 内部方法
        _clickPlaceholder: _interface,
        _focus: _interface,
        _blur: _interface,
        _hover: _interface,

        // 配置项
        value: "",
        placeholder: "",
        type: "input",
        disabled: false,

        // 回调方法

        // 模板
        $template: template,

        $construct: function (defaultConfig, vmConfig, eleConfig) {
            var options = avalon.mix(defaultConfig, vmConfig, eleConfig)
            return options
        },

        $init: function (vm) {
        },

        $ready: function (vm) {
            vm._clickPlaceholder = function(e){
                var input = e.target.nextElementSibling
                input.focus()
            }
            vm._focus = function(){
                vm._focusing = true
                vm._placeholderVisible = false
            }
            vm._blur = function(){
                vm._focusing = false
                if(vm.value === ""){
                    vm._placeholderVisible = true
                }
            }
            vm._hover = function(){
                if(!vm.disabled){
                    vm._hovering = true
                }
            }
        }
    })

    return avalon;
})
/**
 @links
 [基本textbox、配置了width、tabIndex的textbox以及配置了disabledClass的textbox](avalon.textbox.ex1.html)
 [拥有占位符的textbox](avalon.textbox.ex2.html)
 [切换禁用textbox](avalon.textbox.ex3.html)
 [有自动补全功能的textbox](avalon.textbox.ex4.html)
 [无视用户输入的自动补全](avalon.textbox.ex5.html)
 [添加回调操作的自动补全](avalon.textbox.ex6.html)
 */
