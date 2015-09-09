/**
 * 
 * @cnName 数字输入框
 * @enName spinner
 * @introduce
 *    <p>spinner组件是用来增强输入框的能力，使其可以通过上下按钮或者键盘上的up、down键来改变输入域的数值，而且确保输入域始终是数值字符，非数值字符无效，组件会默认将非数值字符转换为最近一次的输入域数值</p>
 */
define(["avalon", "text!./avalon.spinner.html", "css!../chameleon/oniui-common.css", "css!./avalon.spinner.css"], function(avalon, template) {
    var _interface = function () {}

    avalon.component("oni:spinner", {
        // 内部方法
        _add: _interface,
        _sub: _interface,

        // 配置项
        value: 0,
        min: null,
        max: null,
        step: 1,
        disabled: false,

        // 回调方法
        onChange: _interface,

        // 模板
        $template: template,

        $construct: function (defaultConfig, vmConfig, eleConfig) {
            var options = avalon.mix(defaultConfig, vmConfig, eleConfig)
            return options
        },

        $init: function (vm) {
            vm.min = parseInt(vm.min, 10)
            vm.max = parseInt(vm.max, 10)

            // init value
            if(vm.min > vm.max){
                console.log("ERROR: 配置项min应小于max")
                vm.value = NaN
                return
            }

            if(vm.min && vm.min > 0){
                vm.value = vm.min
            }

            if(vm.max && vm.max < 0){
                vm.value = vm.max
            }

            // init operation
            vm._add = function(){
                vm.value = parseInt(vm.value, 10)
                vm.value += 1
            }
            vm._sub = function(){
                vm.value = parseInt(vm.value, 10)
                vm.value -= 1
            }
        },

        $ready: function (vm) {
            // 输入验证（负号、数字、在边界范围内）
            avalon.duplexHooks.limit = {
                get: function(str, data) {
                    if(str === "-"){
                        return str
                    }

                    var result = str = parseInt(str, 10)

                    if(isNaN(str)){
                        result = data.element.value = 0
                    }

                    if(vm.min && str < vm.min){
                        result = data.element.value = vm.min
                    }
                    if(vm.max && str > vm.max){
                        result = data.element.value = vm.max
                    }

                    vm.onChange(result)
                    return result
                }
            }
        }
    })

    return avalon;
})
/**
 @links
 [spinner demo](avalon.spinner.ex.html)
 [动态设置spinner的min、max的值](avalon.spinner.ex1.html)
 */
/**
 * @other
 *  <h1>spinner使用注意点</h1>
    <ol >
        <li>请保证输入域的值是数值或者字符串型的数值，否则会报错</li>
        <li>当通过手动输入值时，如果输入的值不是数值型的，组件会默认将其置为修改之前的值，如果输入大于最大值，组件会自动将其置为最大值，小于最小值时同理
        </li>
        <li>在输入域获得焦点时可通过键盘上的上下箭头控制spinner的增减</li>
        <li>spinner会判断初始输入域值是否在用户设置的数值范围呢，不在的话会进行调整</li>
    </ol>
 */