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
        // 内部变量
        _valueIsValid: true,
        _correctValue: 0,

        // 内部方法
        _add: _interface,
        _sub: _interface,
        _stepTowards: _interface,
        _validate: _interface,
        _correct: _interface,

        // 配置项
        value: 0,
        step: 1,
        disabled: false,
        min: null,
        max: null,

        // 回调方法
        onChange: _interface,

        // 模板
        $template: template,

        $construct: function (defaultConfig, vmConfig, eleConfig) {
            var options = avalon.mix(defaultConfig, vmConfig, eleConfig)
            return options
        },

        $init: function (vm) {
            if(typeof vm.min === "string"){
                vm.min = Number(vm.min)
            }

            if(typeof vm.max === "string"){
                vm.max = Number(vm.max)
            }

            // init value
            if(vm.min > vm.max){
                console.log("ERROR: 配置项min应小于max")
                vm.value = ""
                vm.disabled = true
                return
            }

            if(vm.min !== null && vm.min > 0){
                vm.value = vm.min
            }

            if(vm.max !== null && vm.max < 0){
                vm.value = vm.max
            }

            // init operation
            vm._add = function(){
                vm._stepTowards(1)
            }
            
            vm._sub = function(){
                vm._stepTowards(-1)
            }

            // 步进 & 验证
            vm._stepTowards = function(orientation){
                vm.value = Number(vm.value)

                var calCulatedValue = vm.value + vm.step * orientation,
                    maxNumLength = getMaxNumLength(vm.step, vm.value)

                // 修复js小数不精确
                calCulatedValue = parseFloat(calCulatedValue.toPrecision(maxNumLength))

                // 验证是否在范围内
                var lessThanMin = vm.min !== null && calCulatedValue < vm.min,
                    moreThanMax = vm.max !== null && calCulatedValue > vm.max

                if(lessThanMin){
                    vm.value = vm.min
                } else if(moreThanMax){
                    vm.value = vm.max
                } else{
                    vm.value = calCulatedValue
                }
            }

            vm._validate = function(val) {

                vm._valueIsValid = true

                // 验证是否是负号或没有内容
                if(val === "-" || String(val).trim() === ""){

                    vm._valueIsValid = false

                } else{ // 验证是否是数字 & 是否超出边界

                    val = Number(val)

                    var notNumber = isNaN(val),
                        lessThanMin = vm.min !== null && val < vm.min,
                        moreThanMax = vm.max !== null && val > vm.max

                    if(notNumber){
                        vm._valueIsValid = false
                        vm._correctValue = vm.min === null ? 0 : vm.min
                    } else if(lessThanMin){
                        vm._valueIsValid = false
                        vm._correctValue = vm.min
                    } else if(moreThanMax){
                        vm._valueIsValid = false
                        vm._correctValue = vm.max
                    }
                }
            }
        },

        $ready: function (vm) {

            // 验证改变值是否有效，有效时触发onChange
            vm.$watch("value", function(v){
                vm._validate(v)

                if(vm._valueIsValid){
                    setTimeout(function(){
                        vm.onChange(v)
                    }, 0)
                }
            })

            // input blur时对value进行修正
            vm._correct = function(e){
                if(!vm._valueIsValid){
                    var input = e.target
                    input.value = vm._correctValue
                }
            }
        }
    })

    function getMaxNumLength(){
        var maxLen = 0
        avalon.each(arguments, function(i, item){
            var decimalPart = String(item)

            if(decimalPart && decimalPart.length > maxLen){
                maxLen = decimalPart.length
            }
        })
        return maxLen
    }

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