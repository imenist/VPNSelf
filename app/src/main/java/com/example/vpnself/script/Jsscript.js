// 文档地址：https://docs.hamibot.com/
auto.waitFor()
// auto.setMode('fast')
// auto.setFlags(['findOnUiThread']);
//console.error("[无障碍] 状态正常");

const {
    delivery,
    specs_conf,
    purchase_count_conf,
    type_conf,
    extra_delay_conf,
    delay_conf,
    enable_random_delay_conf,
    random_delay_lower_conf,
    random_delay_upper_conf,
    max_refresh_time_conf,
    auto_click_notification_conf,
    hide_console_conf,
    disable_click,
    debug_mode_conf,
    main_window_alpha_conf,
    ignore_ack_click_delay_conf,
    ignore_ack_click_confirm_delay_conf,
    sku_result_toast_conf,
    rage_stock_refresh_conf,
    script_start_immediately_conf,
    vibrate_time_conf,
    password_or_vibrate_conf,
    password_setting_conf,
    timeout_sleep_wait_time_conf,
    special_confirm_delay_conf,
    hide_sleep_time_conf,
} = hamibot.env;
const { onFreeTrial } = hamibot.plan;

if (!hide_console_conf) {
    console.show()
}
var script_status = 0;
// VARS

var purchase_type = delivery || "到店取";
var purchase_count = parseInt(purchase_count_conf) || 1;
var specs = specs_conf || "单个";
var refresh_delay = parseInt(delay_conf) || 600;
var extra_delay = parseInt(extra_delay_conf) || 0;
var max_refresh_time = parseFloat(max_refresh_time_conf) || 0;
var auto_click_notification = auto_click_notification_conf || false;
var random_refresh_delay_lower = Math.max(parseInt(random_delay_lower_conf) || 10, 1);
var random_refresh_delay_upper = Math.max(parseInt(random_delay_upper_conf) || 50, 1);
var main_window_alpha = Math.min(Math.max(parseFloat(main_window_alpha_conf) || 0.9, 0.0), 1.0);
var ignore_ack_click_delay = parseInt(ignore_ack_click_delay_conf) || 200;
var ignore_ack_click_confirm_delay = parseInt(ignore_ack_click_confirm_delay_conf) || 800;
var last_double_confirm_time = 0;
var last_confirm_time = 0;
var vibrate_time = parseInt(vibrate_time_conf) || 3000;
var password_or_vibrate = password_or_vibrate_conf || "震动(不设置密码)";
var password_setting = parseInt(password_setting_conf) || 123456;
var timeout_sleep_wait_time = parseInt(timeout_sleep_wait_time_conf) || 0;
var special_confirm_delay = parseInt(special_confirm_delay_conf) || 400;
var ignore_ack_conf = true
var hide_sleep_time = parseFloat(hide_sleep_time_conf) || 10

// 快速模式配置 - 减少各种延迟时间
var fast_mode = true; // 默认启用快速模式
var fast_mode_main_loop_delay = fast_mode ? 5 : 10; // 主循环延迟
var fast_mode_stop_delay = fast_mode ? 10 : 20; // 停止时延迟
var fast_mode_check_interval = fast_mode ? 5 : 10; // 检查间隔
var fast_mode_selection_delay = fast_mode ? 0 : 50; // 选择后延迟

// 刷新相关配置
var refresh_on_prepare_sale = true; // 是否在准备发售状态下自动刷新
var max_refresh_attempts = 50; // 最大刷新尝试次数
var refresh_attempt_count = 0; // 当前刷新尝试次数
var start_time = 0;

//console.info('[欢迎使用]  抢购脚本');
console.error('目前的购买方案为: ', purchase_type);
console.error('目前的抢购数量为: ', purchase_count);
console.error('目前的抢购规格为: ', specs);
console.error('库存刷新时间: ', refresh_delay + "ms");
console.error('确认信息并支付点击后等待时间: ', ignore_ack_click_delay + "ms");
console.error('就是这家/确认无误点击后等待时间: ', ignore_ack_click_confirm_delay + "ms");
console.error('确定按钮点击后等待时间: ', special_confirm_delay + "ms");
//if (onFreeTrial) {
//    console.error('目前为免费试用版, 功能受到限制，如果觉得好用请重新订阅后再次购买!');
//    console.error('在试用期间, 刷新速度的配置选项将无效, 固定为2000ms(2秒)');
//    refresh_delay = 2000;
//} else {
//    console.error('您目前使用的是本脚本的付费版, 功能将不会受到限制!');
//    console.error('非常感谢您的支持! 目前脚本将全速运行!');
//    console.error("有任何问题或功能建议，欢迎您发工单");
//}

var storage = storages.create('DRP');
var w = floaty.window(
    <vertical id="main_window" w="80" h="257">
        <horizontal>
            <button id="move_start" text="长按移动" bg="#ffffff" w="80" h="45" visibility="visible" marginBottom="8" />
        </horizontal>

        <button id="delivery_type" text={purchase_type} bg="#0f57f7" color="#ffffff" w="80" h="45" marginBottom="8" />
        <button id="purchase_count_btn" text={"数量: " + purchase_count} bg="#65a56d" color="#ffffff" w="80" h="45" marginBottom="8" />
        <button id="settings" text="设置" bg="#000000" color="#ffffff" w="80" h="45" marginBottom="8" />
        <horizontal>
            <button id="start" text="开始" bg="#E83828" w="80" visibility="visible"/>
            <button id="end" text="停止" bg="#444444" w="80" visibility="gone" />
        </horizontal >
    </vertical>
);

w.main_window.attr('alpha', main_window_alpha);

// 检查本地是否有配置文件（如config.json），有则隐藏设置按钮
let configFileExists = false;
try {
    let configPath = files.join(files.cwd(), 'config.json');
    if (files.exists(configPath)) {
        configFileExists = true;
    }
} catch (e) {
    configFileExists = false;
}

if (configFileExists) {
    w.settings.attr('visibility', 'gone');
} else {
    w.settings.attr('visibility', 'visible');
}

function updateParamSummary() {
    try {
        let display_count = purchase_count;
        if (typeof purchase_count === 'number' && purchase_count > 99) {
            display_count = '99+';
        }
        w.delivery_type.setText(purchase_type);
        w.purchase_count_btn.setText('件数: ' + display_count);
        return;
    } catch (e) {

    }
}

function updateStorage() {
    if (script_start_immediately_conf) {
        // 使用ui.post确保UI操作在UI线程中执行
        ui.post(() => {
            start();
            console.error("[自动启动] 脚本已自动启动");
        });
        return;
    }
    // 确认信息并支付点击后等待时间
    var s_ignore_ack_click_delay = storage.get("s_ignore_ack_click_delay");
    if (s_ignore_ack_click_delay !== null && s_ignore_ack_click_delay !== undefined && s_ignore_ack_click_delay !== '') {
        ignore_ack_click_delay = parseInt(s_ignore_ack_click_delay);
        console.info("[本地读取参数更] 确认信息并支付点击后等待时间: " + ignore_ack_click_delay + "ms");
    }

    // 就是这家/确认无误点击后等待时间
    var s_ignore_ack_click_confirm_delay = storage.get("s_ignore_ack_click_confirm_delay");
    if (s_ignore_ack_click_confirm_delay !== null && s_ignore_ack_click_confirm_delay !== undefined && s_ignore_ack_click_confirm_delay !== '') {
        ignore_ack_click_confirm_delay = parseInt(s_ignore_ack_click_confirm_delay);
        console.info("[本地读取参数更新] 就是这家/确认无误点击后等待时间: " + ignore_ack_click_confirm_delay + "ms");
    }
    // 确定按钮后等待时间的本地读取
    var s_special_confirm_delay = storage.get("s_special_confirm_delay");
    if (s_special_confirm_delay !== null && s_special_confirm_delay !== undefined && s_special_confirm_delay !== '') {
        special_confirm_delay = parseInt(s_special_confirm_delay);
        console.info("[本地读取参数更新] 确定按钮后点击后等待时间: " + special_confirm_delay + "ms");
    }
    
    // 检查并加载确认信息按钮坐标到全局变量
    cached_confirm_info_coords = storage.get("confirm_info_btn_coords");
    if (cached_confirm_info_coords) {
        console.info('[坐标系统] 已加载确认信息按钮坐标: (' + cached_confirm_info_coords.x + ', ' + cached_confirm_info_coords.y + ')');
    } else {
        console.info('[坐标系统] 暂无存储的确认信息按钮坐标，首次识别时将自动存储');
    }
    
    // 检查并加载确认无误按钮坐标到全局变量
    cached_double_confirm_coords = storage.get("double_confirm_btn_coords");
    if (cached_double_confirm_coords) {
        console.info('[坐标系统] 已加载确认无误按钮坐标: (' + cached_double_confirm_coords.x + ', ' + cached_double_confirm_coords.y + ')');
    } else {
        console.info('[坐标系统] 暂无存储的确认无误按钮坐标，首次识别时将自动存储');
    }
}

// 初始化时显示一次，延迟确保悬浮窗完全加载
updateParamSummary();
//存储storage
updateStorage();

function start() {
    script_status = 1;
    start_time = new Date().getTime();
    w.end.attr('visibility', 'visible');
    w.start.attr('visibility', 'gone');
}

function stop() {
    script_status = 0;
    w.end.attr('visibility', 'gone');
    w.start.attr('visibility', 'visible');
}

w.start.click(function () {
    start();
    console.error("[状态] 抢购脚本启动");
});

w.end.click(function () {
    stop();
    console.error("[状态] 抢购脚本停止");
});

// 添加配送方式按钮点击事件
w.delivery_type.click(function () {
    if (purchase_type === '到店取') {
        purchase_type = '送到家';
    } else {
        purchase_type = '到店取';
    }
    w.delivery_type.setText(purchase_type);
    if (purchase_type === '送到家') {
        w.delivery_type.attr('bg', '#E83828'); // 红色
    } else {
        w.delivery_type.attr('bg', '#0f57f7'); // 蓝色
    }
    toast('配送方式已切换为: ' + purchase_type);
});

// 初始化时设置按钮颜色
if (purchase_type === '送到家') {
    w.delivery_type.attr('bg', '#E83828');
} else {
    w.delivery_type.attr('bg', '#0f57f7');
}

// 添加购买数量按钮点击事件
w.purchase_count_btn.click(function () {
    dialogs.rawInput('请输入购买数量', purchase_count.toString())
    .then(function(inputValue) {
        if (inputValue !== null && inputValue !== '') {
            var num = parseInt(inputValue);
            if (num > 0) {
                purchase_count = num;
                updateParamSummary();
                toast('购买数量已设置为: ' + num);
            } else {
                toast('请输入有效的数字');
            }
        }
    });
});

// 长按500ms移动，点击固定（无setAdjustEnabled，不出现四角符号）
let moveStartPressTimer = null;
let moveStartPressed = false;
let moveStartLongPressed = false;
let startX = 0, startY = 0, windowX = 0, windowY = 0;

w.move_start.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            moveStartPressed = true;
            moveStartLongPressed = false;
            startX = event.getRawX();
            startY = event.getRawY();
            windowX = w.getX();
            windowY = w.getY();
            moveStartPressTimer = setTimeout(function() {
                if (moveStartPressed) {
                    moveStartLongPressed = true;
                }
            }, 500);
            return true;
        case event.ACTION_MOVE:
            if (moveStartLongPressed) {
                let dx = event.getRawX() - startX;
                let dy = event.getRawY() - startY;
                w.setPosition(windowX + dx, windowY + dy);
            }
            return true;
        case event.ACTION_UP:
        case event.ACTION_CANCEL:
            moveStartPressed = false;
            if (moveStartPressTimer) {
                clearTimeout(moveStartPressTimer);
            }
            // 松开时保存位置
            if (moveStartLongPressed) {
                var x = w.getX();
                var y = w.getY();
                storage.put('floaty_position_x', x);
                storage.put('floaty_position_y', y);
            }
            return true;
    }
    return false;
});

// 设置项配置
var settingsConfig = {
    '购买规格': {
        type: 'choice',
        options: ['单个', '整盒'],
        value: () => specs,
        setValue: (val) => {
            specs = val;
            console.info("[参数更新] 购买规格:" + val);
        }
    },
    '库存刷新间隔(ms)': {
        type: 'input',
        inputType: 'number',
        value: () => '',
        setValue: (val) => {
            var num = parseInt(val);
            var min = 300; // 最小值限制
            if (isNaN(num) || num < min) {
                num = min;
                toast('最低设置值为' + min + 'ms');
            }
            refresh_delay = num;
            console.info("[参数更新] 库存刷新间隔:" + num + "ms");
        }
    },
    '确认信息并支付点击后等待时间(ms)': {
        type: 'input',
        inputType: 'number',
        value: () => ignore_ack_click_delay.toString(),
        setValue: (val) => {
            var num = parseInt(val);
//            var min = 100; // 最小值限制
//            if (isNaN(num) || num < min) {
//                num = min;
//                toast('最低设置值为' + min + 'ms');
//            }
            ignore_ack_click_delay = num;
            storage.put('s_ignore_ack_click_delay', num);
            console.error("[本地参数更新(优先本地)] 确认支付等待时间:" + num + "ms");
        }
    },
    '确认无误/就是这家点击后等待时间(ms)': {
        type: 'input',
        inputType: 'number',
        value: () => ignore_ack_click_confirm_delay.toString(),
        setValue: (val) => {
            var num = parseInt(val);
//            var min = 150; // 最小值限制
//            if (isNaN(num) || num < min) {
//                num = min;
//                toast('最低设置值为' + min + 'ms');
//            }
            ignore_ack_click_confirm_delay = num;
            storage.put('s_ignore_ack_click_confirm_delay', num);
            console.error("[本地参数更新(优先本地)] 确认无误/就是这家等待时间:" + num + "ms");
        }
    },
    '点击确定按钮点击后等待时间(ms)': {
        type: 'input',
        inputType: 'number',
        value: () => special_confirm_delay.toString(),
        setValue: (val) => {
            var num = parseInt(val);
//            var min = 200; // 最小值限制
//            if (isNaN(num) || num < min) {
//                num = min;
//                toast('最低设置值为' + min + 'ms');
//            }
            special_confirm_delay = num;
            storage.put('s_special_confirm_delay', num);
            console.error("[本地参数更新(优先本地)] 点击确定按钮后等待时间:" + num + "ms");
        }
    },
    '支付密码': {
        type: 'input',
        inputType: 'text',
        value: () => '',
        setValue: (val) => {
            if (val) {
                password_setting = val;
            }
            console.info("[参数更新] 支付密码");
        }
    },
    '隐藏脚本': {
        type: 'action',
        description: '隐藏悬浮窗一段时间',
        action: function() {
            w.main_window.attr('visibility', 'gone');
            toast("隐藏脚本"+ hide_sleep_time * 60 * 1000 + "分钟");
            setTimeout(function() {
                w.main_window.attr('visibility', 'visible');
            }, hide_sleep_time * 60 * 1000);
        }
    },
};

// 显示设置菜单（二级页面）
function showSettingsMenu() {
    var items = Object.keys(settingsConfig);
    dialogs.select("请选择设置项", items)
        .then(function(itemIdx) {
            if (itemIdx < 0) return;
            var selectedItem = items[itemIdx];
            var config = settingsConfig[selectedItem];
            // 处理不同类型的设置项
            if (config.type === 'choice') {
                showChoiceSetting(selectedItem, config);
            } else if (config.type === 'input') {
                showInputSetting(selectedItem, config);
            } else if (config.type === 'action') {
                showActionSetting(selectedItem, config);
            }
        });
}

// 处理选择类型设置（三级页面）
function showChoiceSetting(itemName, config) {
    var currentIdx = config.options.indexOf(config.value());
    dialogs.singleChoice(itemName, config.options, currentIdx)
        .then(function(selectedIdx) {
            if (selectedIdx >= 0) {
                config.setValue(config.options[selectedIdx]);
                updateParamSummary();
                toast(itemName + ' 已设置为: ' + config.options[selectedIdx]);
            }
            // 设置完成后返回设置菜单
            showSettingsMenu();
        });
}

// 处理输入类型设置（三级页面）
function showInputSetting(itemName, config) {
    var currentValue = config.value();
    var prompt = '请输入 ' + itemName;
    if (config.inputType === 'number') {
        prompt += ' (数字)';
    }

    dialogs.rawInput(prompt, currentValue)
    .then(function(inputValue) {
        if (inputValue !== null && inputValue !== '') {
            try {
                config.setValue(inputValue);
                updateParamSummary();
                toast(itemName + ' 已设置为: ' + inputValue);
            } catch (e) {
                toast('设置失败: ' + e.message);
            }
        }
        // 设置完成后返回设置菜单
        showSettingsMenu();
    });
}

// 处理操作类型设置（三级页面）
function showActionSetting(itemName, config) {
    try {
        config.action();
        console.info("[设置操作] " + itemName + " 执行成功");
    } catch (e) {
        toast('操作执行失败: ' + e.message);
        console.error("[设置操作] " + itemName + " 执行失败: " + e.message);
        // 如果执行失败，则返回设置菜单
        showSettingsMenu();
    }
    // 执行成功后不返回设置菜单，直接关闭
}

w.settings.click(function () {
    'ui';
    showSettingsMenu();
});

var posX = storage.get('floaty_position_x');
var posY = storage.get('floaty_position_y');
var defaultX = device.width / 2 + 100;
var defaultY = w.getY() + 100;
if (typeof posX === 'number' && typeof posY === 'number' && posX >= 0 && posX + 100 <= device.width) {
    w.setPosition(posX, posY);
} else {
    w.setPosition(defaultX, defaultY);
}

function clickNotifyBtn() {
    var btn = className("android.widget.TextView").text("到货通知").findOne(20);
    if (btn) {
        console.warn("已点击到货通知按钮");
        btn.click();
    }
}

function safeDeepChild(node, depth) {
    let current = node;
    let level = 0;

    while (current != null && level < depth) {
        try {
            current = current.child(0);
        } catch (e) {
            log("Exception at level " + level + ": " + e);
            return null;
        }

        level++;
    }

    return current;
}

function get_webview_parent(input_node) {
    var lastRelative = null;
    var output_node = input_node;

    // Go up 13 levels, keep track of the last RelativeLayout
    for (var i = 0; i < 13; i++) {
        if (output_node == null) break;

        if (output_node.className() === "android.widget.RelativeLayout") {
            lastRelative = output_node;
        }

        if (output_node) {
            output_node = output_node.parent();
        }


    }

    // Go 3 levels up from the last found RelativeLayout
    if (lastRelative != null) {
        output_node = lastRelative;
        for (var i = 0; i < 2; i++) {
            if (output_node == null) break;
            output_node = output_node.parent();
        }

        if (output_node != null) {
            let b = output_node.bounds();
        } else {
            log("Top node is null after going up 3 parents.");
        }
    } else {
        log("No RelativeLayout found in 13 levels.");
    }

    return output_node;
}

function get_header_text(current_node) {
    // Get first child if any
    if (!current_node) {
        return "no_header";
    }
    if (current_node.childCount() === 0) {
        return "no_header";
    }
    var firstChild = current_node.child(0);
    if (!firstChild) {
        return "no_header";
    }

    // Check if child is RelativeLayout
    if (firstChild.className() !== "android.widget.RelativeLayout") {
        return "no_header";
    }

    // Get child with highest drawing order
    var relativeLayoutChildren = firstChild.children();
    if (!relativeLayoutChildren || relativeLayoutChildren.length === 0) {
        return "";
    }

    var maxOrder = 0;
    var highestOrderChild = relativeLayoutChildren[0];
    for (var i = 0; i < relativeLayoutChildren.length; i++) {
        var child = relativeLayoutChildren[i];
        var order = child ? child.drawingOrder() : 0;
        if (order > maxOrder) {
            maxOrder = order;
            highestOrderChild = child;
        }
    }

    // Get first child of highest order child
    if (!highestOrderChild) {
        return "";
    }
    var targetChild = highestOrderChild && highestOrderChild.childCount() > 0 ? highestOrderChild.child(0) : null;
    if (!targetChild) {
        return "";
    }

    // Search for TextView using BFS
    var textView = targetChild.findOne(className('android.widget.TextView').algorithm('BFS'));
    if (!textView) {
        return "";
    }

    return textView.text();
}

function get_webview_parent_node() {
    var webview_parent_node = className('android.widget.RelativeLayout').algorithm('BFS').findOne(100);
    if (!webview_parent_node) {
        return null;
    }
    if (!webview_parent_node.parent()) {
        return null;
    }
    var parent1 = webview_parent_node.parent();
    if (!parent1.parent()) {
        return null;
    }
    webview_parent_node = parent1.parent();
    return webview_parent_node;
}

function get_current_node(webview_parent_node) {
    var count = webview_parent_node.childCount();
    if (count == 0) {
        return null;
    }

    var maxOrder = 0;
    var maxOrderIndex = count - 1;
    var hasZeroOrder = false;

    for (var i = 0; i < count; i++) {
        var child = webview_parent_node.child(i);
        var order = child ? child.drawingOrder() : 0;
        if (order === 0) {
            hasZeroOrder = true;
            break;
        }
        if (order > maxOrder) {
            maxOrder = order;
            maxOrderIndex = i;
        }
    }

    if (hasZeroOrder) {
        return webview_parent_node.child(count - 1);
    }

    return webview_parent_node.child(maxOrderIndex);
}

function get_current_webview(current_node) {
    return current_node.findOne(className('android.webkit.WebView').algorithm('DFS')) || null;
}

function get_current_webview_fast(current_node) {
    if (!current_node) {
        return null;
    }
    if (current_node.childCount() < 1) {
        return null;
    }
    var first_child = current_node.child(0);
    if (!first_child) {
        return null;
    }

    if (first_child.className() !== 'android.widget.RelativeLayout') {
        return null;
    }

    var lowest_order_child = null;
    var lowest_order = Number.MAX_VALUE;
    var child_count = first_child.childCount();

    for (var i = 0; i < child_count; i++) {
        var child = first_child.child(i);
        if (!child) continue;
        var order = child.drawingOrder();
        if (order < lowest_order) {
            lowest_order = order;
            lowest_order_child = child;
        }
    }

    if (!lowest_order_child) {
        return null;
    }
    if (lowest_order_child.childCount() < 1) {
        return null;
    }
    var child1 = lowest_order_child.child(0);
    if (!child1) {
        return null;
    }

    var drawing_order_2_child = null;
    var child1_count = child1.childCount();
    for (var i = 0; i < child1_count; i++) {
        var child = child1.child(i);
        if (!child) continue;
        if (child.drawingOrder() === 2) {
            drawing_order_2_child = child;
            break;
        }
    }

    if (!drawing_order_2_child) {
        return null;
    }
    var deep_child = drawing_order_2_child.child(0);
    if (!deep_child || deep_child.childCount() < 1) {
        return null;
    }
    deep_child = deep_child.child(0);
    if (!deep_child || deep_child.childCount() < 1) {
        return null;
    }
    deep_child = deep_child.child(0);
    if (!deep_child || deep_child.childCount() < 1) {
        return null;
    }
    deep_child = deep_child.child(0);
    if (!deep_child) {
        return null;
    }

    var zero_order_child = null;
    var deep_child_count = deep_child.childCount();
    for (var i = 0; i < deep_child_count; i++) {
        var child = deep_child.child(i);
        if (!child) continue;
        if (child.drawingOrder() === 0) {
            zero_order_child = child;
            break;
        }
    }

    if (!zero_order_child) {
        return null;
    }

    if (zero_order_child.childCount() < 1) {
        return null;
    }
    var zero_order_child2 = zero_order_child.child(0);
    if (!zero_order_child2) {
        return null;
    }

    if (zero_order_child2.className() === 'android.webkit.WebView') {
        return zero_order_child2;
    }

    return null;
}

function check_current_page_tree(header_text, current_webview) {
//    console.info("check_current_page_tree")
    if (!current_webview) {
        return { header: header_text, status: "no_webview" };
    }
    if (header_text === "确认订单") {
        return { header: header_text, status: "confirm_and_pay" };
    } else if (header_text == "") {
        var startTime = Date.now();
        var purchaseTypeElement = current_webview.findOne(text("购买方式").algorithm('DFS'));

        if (purchaseTypeElement) {
            return { header: header_text, status: "purchase" };
        }

        if (Date.now() - startTime > 20) {
            return { header: header_text, status: "default" };
        }

        // 检查是否有"立即购买"按钮
        var buyNowElement = current_webview.findOne(text("立即购买").algorithm('DFS'));
        if (buyNowElement) {
            return { header: header_text, status: "info_page" };
        }

        // 检查是否有"距离开售时间还剩00:00"文字
        var prepareSaleElement = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));
        if (prepareSaleElement) {
            return { header: header_text, status: "prepare_sale" };
        }

        var hidden_confirm_btn = current_webview.findOne(text("确认信息并支付").algorithm('DFS'));
        if (hidden_confirm_btn) {
            return { header: header_text, status: "confirm_and_pay" };
        }

        return { header: header_text, status: "default" };
    } else {
        log("标题异常");
        var hidden_confirm_btn = current_webview.findOne(text("确认信息并支付").algorithm('DFS'));
        if (hidden_confirm_btn) {
            log("标题异常 找到 确认信息并支付");
            return { header: header_text, status: "confirm_and_pay" };
        }

        return { header: header_text, status: "default" };
    }
}

// 添加下拉刷新功能
function performPullRefresh(webview) {
    if (!webview) {
        console.warn("[错误] WebView为空，无法执行下拉刷新");
        return false;
    }

    try {
        console.info("开始执行下拉刷新");

        // 获取WebView的边界
        var bounds = webview.bounds();
        var centerX = bounds.centerX();

        // 确保在WebView内部进行下拉刷新
        // 从WebView内部上方30%的位置开始，向下拖拽到60%的位置
        var webviewHeight = bounds.height();
        var startY = bounds.top + (webviewHeight * 0.2); // 从WebView顶部30%的位置开始
        var endY = bounds.top + (webviewHeight * 0.8); // 拖拽到WebView 60%的位置

        console.info("下拉刷新坐标 - 起始: (" + centerX + ", " + startY + "), 结束: (" + centerX + ", " + endY + ")");

        // 执行下拉手势
        swipe(centerX, startY, centerX, endY, 600);

        console.info("下拉刷新手势已执行");
        sleep(3000); // 等待刷新完成

        return true;
    } catch (e) {
        console.error("[错误] 下拉刷新失败: " + e.message);
        return false;
    }
}

// 添加替代的滚动刷新方法
function performScrollRefresh(webview) {
    if (!webview) {
        console.warn("[错误] WebView为空，无法执行滚动刷新");
        return false;
    }

    try {
        console.info("开始执行滚动刷新");

        // 获取WebView的边界
        var bounds = webview.bounds();
        var centerX = bounds.centerX();
        var webviewHeight = bounds.height();

        // 确保在WebView内部进行滚动操作
        var topPos = bounds.top + (webviewHeight * 0.4); // WebView 40%位置
        var centerPos = bounds.top + (webviewHeight * 0.5); // WebView 50%位置
        var bottomPos = bounds.top + (webviewHeight * 0.6); // WebView 60%位置

        console.info("滚动刷新坐标");

        // 执行轻微的上下滚动动作来触发刷新
        swipe(centerX, centerPos, centerX, topPos, 300);
        sleep(150);
        swipe(centerX, topPos, centerX, bottomPos, 400);
        sleep(300);
        swipe(centerX, bottomPos, centerX, centerPos, 300);

        console.info("滚动刷新已执行");
        sleep(600);

        return true;
    } catch (e) {
        console.error("[错误] 滚动刷新失败: " + e.message);
        return false;
    }
}

// 添加多种刷新方法的组合
function performRefreshActions(webview) {
    console.info("开始执行刷新操作");

    var refreshSuccess = false;

    // 方法1: 下拉刷新
    if (!refreshSuccess) {
        refreshSuccess = performPullRefresh(webview);
    }

    // 方法2: 如果下拉刷新失败，尝试滚动刷新
    if (!refreshSuccess) {
        refreshSuccess = performScrollRefresh(webview);
    }

    // 方法3: 如果都失败，尝试点击页面中心进行刷新
    if (!refreshSuccess) {
        try {
            console.info("尝试点击页面中心进行刷新");
            var bounds = webview.bounds();
            var centerX = bounds.centerX();
            var centerY = bounds.top + (bounds.height() * 0.5); // WebView中心位置

            console.info("点击刷新坐标: (" + centerX + ", " + centerY + ")");
            click(centerX, centerY);
            sleep(500);
            refreshSuccess = true;
        } catch (e) {
            console.error("[错误] 点击刷新失败: " + e.message);
        }
    }

    return refreshSuccess;
}

function click_plus_btn(current_webview) {
    if (!current_webview) {
        console.warn("[错误] WebView为空");
        return;
    }

    var number_text = current_webview.findOne(className("android.widget.TextView").text("数量").algorithm('DFS'));
    if (!number_text) {
        return;
    }

    var idx_num_text = number_text.indexInParent();
    var parent_view = number_text.parent();
    if (!parent_view) {
        return;
    }

    if (parent_view.childCount() < idx_num_text + 4) {
        return;
    }

    var plus_btn = parent_view.child(idx_num_text + 3);
    if (!plus_btn) {
        return;
    }

    plus_btn.click();
}

function satisfyPurchaseCount(current_webview, target) {
    var number_text = current_webview.findOne(className("android.widget.TextView").text("数量").algorithm('DFS'));
    var idx_num_text = number_text.indexInParent()
    var parent_view = number_text.parent()
    var minus_btn = parent_view.child(idx_num_text + 1);
    var number_count_text = parent_view.child(idx_num_text + 2);
    var plus_btn = parent_view.child(idx_num_text + 3);
    var current = parseInt(number_count_text.text());
    if (isNaN(current)) {
        console.warn("无法处理购买数量: " + number_count_text.text());
        return;
    }
    var current = parseInt(number_count_text.text());
    if (current === target) {
        console.warn("当前已满足购买数量要求: " + current);
        return;
    }
    if (current > target) {
        var diff = current - target;
        for (var i = 0; i < diff; i++) {
            minus_btn.click();
            sleep(10);
        }
    } else {
        var diff = target - current;
        for (var i = 0; i < diff; i++) {
            plus_btn.click();
            sleep(10);
        }
    }
}

// 等待密码键盘出现并输入密码的函数
function waitAndInputPassword(password) {
    console.info("[密码输入] 开始等待微信支付密码键盘出现...");

    var maxWaitTime = 15000; // 最大等待15秒
    var startTime = Date.now();
    var coordinates = null;

    // 循环等待直到找到足够的数字按钮
    while (Date.now() - startTime < maxWaitTime) {
        // 检查脚本状态，如果被暂停则退出
        if (script_status == 0) {
            return false;
        }

        coordinates = getPasswordKeyboardCoordinates();

        if (coordinates && Object.keys(coordinates).length >= 9) {
            break;
        }


        sleep(1000); // 等待1秒后重试
    }

    // 再次检查脚本状态
    if (script_status == 0) {
        return false;
    }

    if (!coordinates || Object.keys(coordinates).length < 9) {
        console.error("等待超时或未找到密码键盘");
        return false;
    }

    // 输入用户设置的密码

    for (var i = 0; i < password.length; i++) {
        // 在每次输入前检查脚本状态
        if (script_status == 0) {
            return false;
        }

        var digit = password.charAt(i);
        var coord = coordinates[digit];

        if (coord) {
            click(coord.x, coord.y);
            sleep(300); // 每次点击间隔300ms
        } else {
            return false;
        }
    }

    console.info("[密码输入] 密码输入完成！");


    // 在点击确认前检查脚本状态
    if (script_status == 0) {
        return false;
    }

    // 可选：自动点击确认按钮
    sleep(500);
    var confirmButton = text("确认").findOne(1000);
    if (!confirmButton) {
        confirmButton = text("完成").findOne(1000);
    }
    if (!confirmButton) {
        confirmButton = desc("确认").findOne(1000);
    }
    if (!confirmButton) {
        confirmButton = desc("完成").findOne(1000);
    }

    if (confirmButton) {
        confirmButton.click();
    }

    return true;
}

// 获取微信支付密码键盘坐标的函数
function getPasswordKeyboardCoordinates() {
    try {
        console.info("[测试] 开始搜索数字键盘坐标...");

        // 查找数字1到9的坐标
        var numberCoordinates = {};
        var foundNumbers = [];

        // 遍历数字1到9
        for (var i = 1; i <= 9; i++) {
            // 检查脚本状态，如果被暂停则退出
            if (script_status == 0) {
                console.error("[状态] 抢购脚本停止");
                return null;
            }

            var numberText = i.toString();

            // 尝试多种方法查找数字按钮
            var numberButton = null;

            // 方法1: 直接查找文本
            numberButton = text(numberText).findOne(200);
            if (!numberButton) {
                // 方法2: 查找描述
                numberButton = desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法3: 查找包含数字的TextView
                numberButton = className("android.widget.TextView").text(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法4: 查找包含数字的Button
                numberButton = className("android.widget.Button").text(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法5: 查找包含数字的ImageView（某些键盘可能用图片）
                numberButton = className("android.widget.ImageView").desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法6: 查找包含数字的LinearLayout
                numberButton = className("android.widget.LinearLayout").desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法7: 使用正则表达式查找
                numberButton = textMatches(".*" + numberText + ".*").findOne(200);
            }
            if (!numberButton) {
                // 方法8: 查找clickable元素
                numberButton = clickable(true).text(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法9: 查找RelativeLayout
                numberButton = className("android.widget.RelativeLayout").desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法10: 查找FrameLayout
                numberButton = className("android.widget.FrameLayout").desc(numberText).findOne(200);
            }

            if (numberButton) {
                var bounds = numberButton.bounds();
                var centerX = bounds.centerX();
                var centerY = bounds.centerY();

                numberCoordinates[numberText] = {
                    x: centerX,
                    y: centerY,
                    left: bounds.left,
                    top: bounds.top,
                    right: bounds.right,
                    bottom: bounds.bottom
                };

                foundNumbers.push(numberText);

            } else {
                // 如果特定数字找不到，记录详细信息
            }
        }

        // 也尝试查找数字0
        // 检查脚本状态，如果被暂停则退出
        if (script_status == 0) {
            return null;
        }

        var zeroButton = null;
        zeroButton = text("0").findOne(200);
        if (!zeroButton) {
            zeroButton = desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.TextView").text("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.Button").text("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.ImageView").desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.LinearLayout").desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = textMatches(".*0.*").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = clickable(true).text("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.RelativeLayout").desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.FrameLayout").desc("0").findOne(200);
        }

        if (zeroButton) {
            var bounds = zeroButton.bounds();
            var centerX = bounds.centerX();
            var centerY = bounds.centerY();

            numberCoordinates["0"] = {
                x: centerX,
                y: centerY,
                left: bounds.left,
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom
            };

            foundNumbers.push("0");
        }
        // 只有当找到足够的数字时才输出详细信息
        if (foundNumbers.length >= 9) {

            // 输出所有坐标信息
            for (var i = 1; i <= 9; i++) {
                // 检查脚本状态，如果被暂停则退出
                if (script_status == 0) {
                    return null;
                }

                var digit = i.toString();
                if (numberCoordinates[digit]) {
                    var coord = numberCoordinates[digit];
                }
            }
            if (numberCoordinates["0"]) {
                var coord = numberCoordinates["0"];
            }

            // 查找删除按钮和确认按钮
            var deleteButton = text("删除").findOne(200);
            if (!deleteButton) {
                deleteButton = desc("删除").findOne(200);
            }
            if (!deleteButton) {
                deleteButton = text("←").findOne(200);
            }
            if (!deleteButton) {
                deleteButton = desc("←").findOne(200);
            }

            if (deleteButton) {
                var bounds = deleteButton.bounds();
            }

            var confirmButton = text("确认").findOne(200);
            if (!confirmButton) {
                confirmButton = text("完成").findOne(200);
            }
            if (!confirmButton) {
                confirmButton = desc("确认").findOne(200);
            }
            if (!confirmButton) {
                confirmButton = desc("完成").findOne(200);
            }

            if (confirmButton) {
                var bounds = confirmButton.bounds();
            }
        }

        return numberCoordinates;

    } catch (e) {
        return null;
    }
}

// STATE VARIABLES - These need to be reset when script_status = 0
var rebuy_flag = false;
var submit_flag = false;
var confirm_btn_retry_count = 0;
var ignore_next_purchase_page_flag = false;
var first_enter_confirm_and_buy = true;

var dc_streak = 0;

var defaultInterval = 150;

// 新增：防止重复点击确认信息并支付
var hasClickedConfirmAndPay = false;

// 全局存储确认按钮坐标
var cached_confirm_info_coords = null;
var cached_double_confirm_coords = null;

//安全点击函数，带超时保护
function safeClick(btn, timeoutMs) {
    var finished = false;
    var result = false;
    var errMsg = null;
    var thread = threads.start(function() {
        try {
            btn.click();
            result = true;
            console.error("[点击] 确认信息并支付3");
        } catch (e) {
//            console.error("[点击失败] 确认信息并支付1 异常:"+ e.message);
            errMsg = e.message;
        }
        finished = true;
    });
    var start = new Date().getTime();
    while (!finished && (new Date().getTime() - start < timeoutMs)) {
        sleep(50);
    }
    if (!finished) {
        thread.interrupt();
        console.error("[超时] confirm_btn.click() 超过 " + timeoutMs + "ms，强制跳过！");
        return false;
    }
    if (errMsg) {
        console.error("[异常] confirm_btn.click() 失败: " + errMsg);
        return false;
    }
    return result;
}

while (true) {
    if (script_status == 0) {
        // Reset ALL state variables to ensure clean restart
        rebuy_flag = false;
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        dc_streak = 0;
        last_double_confirm_time = 0;
        last_confirm_time = 0;
        confirm_btn_retry_count = 0;
        refresh_attempt_count = 0; // 重置刷新尝试次数
        hasClickedConfirmAndPay = false; // 新增：重置点击锁
        // 注意：不重置坐标存储，但重新加载缓存以确保一致性
        cached_confirm_info_coords = storage.get("confirm_info_btn_coords");
        cached_double_confirm_coords = storage.get("double_confirm_btn_coords");
        sleep(5); // 使用快速模式停止延迟
        continue;
    }
    // log("===start===")
    sleep(5); // 使用快速模式主循环延迟
    // console.time("get_webview_parent_node");
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        if (debug_mode_conf) {
            log("Cannot find webview parent node.");
        }
        if (submit_flag) {
            submit_flag = false;
            console.error("[页面检测] 当前处于支付页面");
            console.warn("[通知] 抢购完成! 祝老板大赚!");
            device.vibrate(vibrate_time);

            // 判断是否需要输入密码
            if (password_or_vibrate === "震动(不设置密码)") {
                console.info("[密码设置] 选择了震动模式，不自动输入密码");
            } else {
                console.info("[密码输入] 开始等待微信支付密码键盘...");
                waitAndInputPassword(password_setting.toString());
            }
        }
        continue;
    }
    // console.timeEnd("get_webview_parent_node");

    // console.time("get_current_node");
    var current_node = get_current_node(webview_parent_node);
    if (!current_node) {
        if (debug_mode_conf) {
            log("Cannot find current node.");
        }
        continue;
    }
    // console.timeEnd("get_current_node");

    // console.time("get_header_text");
    var header_text = get_header_text(current_node);
    // console.timeEnd("get_header_text");

    // console.time("get_current_webview");
    var current_webview = get_current_webview_fast(current_node);
    if (!current_webview) {
        if (debug_mode_conf) {
            log("Cannot find current webview.");
        }
        continue;
    }
    // console.timeEnd("get_current_webview");

    // console.time("check_current_page_tree");
    var page_info = check_current_page_tree(header_text, current_webview);
    // console.timeEnd("check_current_page_tree");
    if (debug_mode_conf) {
        log("Header: " + page_info.header + ", Status: " + page_info.status);
    }

    switch (page_info.status) {
        case "confirm_and_pay":
            var ignore_next_purchase_page_flag = false;
            rebuy_flag = true;
            if (!current_webview) {
                log("Cannot find current webview.");
                sleep(10);
                break;
            }

            // console.time("find_last_view");
            var last_view = null;
            var childCount = 0;
            try {
                childCount = current_webview.childCount();
//                log("当前页面childCount个数："+childCount);
            } catch (e) {
                sleep(10); // 防止死循环
                break;
            }
            
            // 特殊处理：当 childCount 为 17 时，尝试使用确认信息并支付按钮坐标点击
            if (childCount === 17 && cached_confirm_info_coords) {
                try {
//                    console.error("[坐标点击] 确认信息并支付" + cached_confirm_info_coords.x + cached_confirm_info_coords.y);
                    click(cached_confirm_info_coords.x, cached_confirm_info_coords.y);
                    hasClickedConfirmAndPay = true;
                    sleep(ignore_ack_click_delay);
                    break;
                } catch (e) {
//                    console.error("[坐标点击失败] 确认信息并支付按钮坐标点击失败: " + e.message);
                    // 清除无效的坐标
                    storage.remove("confirm_info_btn_coords");
                    cached_confirm_info_coords = null;
                }
            }

            var confirm_btn = null;
            var confirm_btn_found = false;

            // 优先尝试使用缓存的确认信息按钮坐标点击
            if (cached_confirm_info_coords && !hasClickedConfirmAndPay && first_enter_confirm_and_buy) {
                try {
                    click(cached_confirm_info_coords.x, cached_confirm_info_coords.y);
                    console.error("[点击] 确认信息并支付1");
                    hasClickedConfirmAndPay = true;
                    confirm_btn_found = true;
                    dc_streak = 0;
                    sleep(ignore_ack_click_delay);
                } catch (e) {
//                    console.error("[坐标点击失败] 缓存的坐标点击失败: " + e.message + "，回退到层级判断");
                    // 清除无效的坐标
                    storage.remove("confirm_info_btn_coords");
                    cached_confirm_info_coords = null; // 同时清除缓存
                }
            }

            var double_confirm_btn = null;
            var double_confirm_btn_found = false;

            // 优先尝试使用缓存的确认无误按钮坐标点击
            if (cached_double_confirm_coords && dc_streak == 0  && first_enter_confirm_and_buy) {
                try {
//                    console.info("[坐标点击] 尝试使用缓存的确认无误按钮坐标: (" + cached_double_confirm_coords.x + ", " + cached_double_confirm_coords.y + ")");
                    click(cached_double_confirm_coords.x, cached_double_confirm_coords.y);
                    console.error("[点击] 确认无误|就是这家1");
                    last_double_confirm_time = new Date().getTime();
                    submit_flag = true;
                    dc_streak++;
                    double_confirm_btn_found = true;
                    sleep(ignore_ack_click_confirm_delay);
                } catch (e) {
//                    console.error("[坐标点击失败] 缓存的确认无误坐标点击失败: " + e.message + "，回退到层级判断");
                    // 清除无效的坐标
                    storage.remove("double_confirm_btn_coords");
                    cached_double_confirm_coords = null; // 同时清除缓存
                }
            }



            // console.time("find_last_view");
            var last_view = null;
            var childCount = current_webview.childCount();
            for (var i = childCount - 1; i >= 0; i--) {
                try {
                    var child = current_webview.child(i);
                } catch (e) {
                    break;
                }
                if (!child) {
                    break;
                }
                if (child.className() === "android.view.View") {
                    last_view = child;
                    break;
                }
            }
            // console.timeEnd("find_last_view");

            if (!last_view) {
                if (debug_mode_conf) {
                    log("Cannot find last view.");
                }
                sleep(30);
                break;
            }

            if (!last_view) {
//                console.error("[错误] 多次重试后仍未找到 last_view，跳过本轮");
                sleep(200); // 防止空转
                break;
            }
            // console.timeEnd("find_last_view");

            if (!last_view) {
                if (debug_mode_conf) {
                    log("Cannot find last view.");
                }
                sleep(30);
                break;
            }

            // console.time("find_confirm_btn");
            if (first_enter_confirm_and_buy) {
                var hidden_double_confirm = current_webview.findOne(textMatches(/(确认无误|就是这家)/).algorithm('DFS'));
                if (hidden_double_confirm) {
                    try {
                          var hidden_double_confirm_bounds = hidden_double_confirm.bounds();
                          if (hidden_double_confirm_bounds && !cached_double_confirm_coords) {
                              var double_confirm_coords = {
                                  x: hidden_double_confirm_bounds.centerX(),
                                  y: hidden_double_confirm_bounds.centerY()
                              };
                              storage.put("double_confirm_btn_coords", double_confirm_coords);
                              cached_double_confirm_coords = double_confirm_coords;
//                              console.info("[坐标存储] 确认无误按钮坐标已存储并缓存(备用): (" + double_confirm_coords.x + ", " + double_confirm_coords.y + ")");
                          }
                      } catch (e) {
//                          console.warn("[坐标获取] 获取确认无误按钮坐标失败(备用): " + e.message);
                      }

                      last_double_confirm_time = new Date().getTime();
                      hidden_double_confirm.click();
//                      console.error("[文本点击] 确认无误|就是这家 坐标后文本识别");
                      submit_flag = true;
                      dc_streak++;
                      first_enter_confirm_and_buy = false;
                      sleep(ignore_ack_click_confirm_delay);
                      break;
                } else {
                    first_enter_confirm_and_buy = false;
//                    console.error("确认无误|就是这家 文本无法识别 ");
                    break;
                }

            }


            // 如果坐标点击失败或没有存储坐标，使用原来的层级判断
            if (!confirm_btn_found) {
                if (last_view.childCount() == 4) {
                    confirm_btn = last_view.child(3);
                }

                if (confirm_btn) {
                    dc_streak = 0;
                    // 新增：防止重复点击
                    if (!hasClickedConfirmAndPay) {
                        try {
                            if (confirm_btn && typeof confirm_btn.click === 'function') {
                                var beforeClickBounds = null;
                                try {
                                    beforeClickBounds = confirm_btn.bounds();
                                    // 存储确认信息按钮坐标到storage和缓存
                                    if (beforeClickBounds && !cached_confirm_info_coords) {
                                        var confirm_info_coords = {
                                            x: beforeClickBounds.centerX(),
                                            y: beforeClickBounds.centerY()
                                        };
                                        storage.put("confirm_info_btn_coords", confirm_info_coords);
                                        cached_confirm_info_coords = confirm_info_coords; // 同时更新缓存
//                                        console.info("[坐标存储] 确认信息按钮坐标已存储并缓存: (" + confirm_info_coords.x + ", " + confirm_info_coords.y + ")");
                                    }
                                } catch (e) {
//                                    console.warn("[坐标获取] 获取确认按钮坐标失败: " + e.message);
                                }
                                var clickResult = safeClick(confirm_btn, 2000); // 2秒超时
                                if (clickResult) {
                                    hasClickedConfirmAndPay = true;
                                }
                                var afterClickBounds = null;
                                try {
                                    afterClickBounds = confirm_btn.bounds();
                                } catch (e) {

                                }
                            }
                        } catch (e) {
//                            console.error("[层级点击失败] " + e.message);
                        }
                    }
                    confirm_btn_found = true;
                }
            }

            // console.timeEnd("find_confirm_btn");
//            if (confirm_btn_found) {
//                sleep(extra_delay);
//                log("confirm_btn_found = true sleep"+extra_delay+"break;");
//                break;
//            }

            // console.time("find_double_confirm");


            // 如果坐标点击失败或没有存储坐标，使用原来的层级判断
            if (last_view.childCount() == 2 && dc_streak == 0) {
                var second_child = last_view.child(1);
                if (second_child && second_child.className() === "android.view.View") {
                    if (second_child.childCount() == 1) {
                        var inner_view = second_child.child(0);
                        if (inner_view && inner_view.className() === "android.view.View") {
                            double_confirm_btn = inner_view.child(inner_view.childCount() - 1);
                        }
                    }
                }
            }
            // console.timeEnd("find_double_confirm");
            if (double_confirm_btn) {
//                console.info("页面结构找到 确认无误|就是这家1");
                if (dc_streak == 0) {
                    // 存储确认无误按钮坐标
                    if (!cached_double_confirm_coords) {
                         try {
                             var double_confirm_bounds = double_confirm_btn.bounds();
                             if (double_confirm_bounds) {
                                 var double_confirm_coords = {
                                     x: double_confirm_bounds.centerX(),
                                     y: double_confirm_bounds.centerY()
                                 };
                                 storage.put("double_confirm_btn_coords", double_confirm_coords);
                                 cached_double_confirm_coords = double_confirm_coords;
//                                 console.info("[坐标存储] 确认无误按钮坐标已存储并缓存: (" + double_confirm_coords.x + ", " + double_confirm_coords.y + ")");
                             }
                         } catch (e) {
//                             console.warn("[坐标获取] 获取确认无误按钮坐标失败: " + e.message);
                         }

                    }


                    last_double_confirm_time = new Date().getTime();
                    double_confirm_btn.click();
                    console.error("[点击] 确认无误|就是这家3");
                    submit_flag = true;
                    dc_streak++;
                    double_confirm_btn_found = true;
                    sleep(ignore_ack_click_confirm_delay);
                } else if (dc_streak >= 5) {
                    double_confirm_btn.click();
                    console.error("[点击] 确认无误|就是这家3.1");
                    submit_flag = true;
                    dc_streak = 0;
                    double_confirm_btn_found = true;
                } else {
                    console.info("dc_streak++");
                    dc_streak++;
                    double_confirm_btn_found = true;
                    sleep(20);
                }
            }

            // 统一的 break 逻辑
            if (double_confirm_btn_found) {
                break;
            }


            // 处理"确认无误|就是这家"按钮
            var hidden_double_confirm = current_webview.findOne(textMatches(/(确认无误|就是这家)/).algorithm('DFS'));
                if (hidden_double_confirm) {
                    if (dc_streak == 0 && cached_double_confirm_coords != null) {
                            // 存储确认无误按钮坐标（备用方法）
                            try {
                                var hidden_double_confirm_bounds = hidden_double_confirm.bounds();
                                if (hidden_double_confirm_bounds && !cached_double_confirm_coords) {
                                    var double_confirm_coords = {
                                        x: hidden_double_confirm_bounds.centerX(),
                                        y: hidden_double_confirm_bounds.centerY()
                                    };
                                    storage.put("double_confirm_btn_coords", double_confirm_coords);
                                    cached_double_confirm_coords = double_confirm_coords;
                                }
                            } catch (e) {
//                                console.warn("[坐标获取] 获取确认无误按钮坐标失败(备用): " + e.message);
                            }

                            last_double_confirm_time = new Date().getTime();
                            hidden_double_confirm.click();
                            console.error("[点击] 确认无误|就是这家2")
                            submit_flag = true;
                            dc_streak++;
                            sleep(ignore_ack_click_confirm_delay);
                            break;
                    } else {
//                        console.error("[找到] 确认无误|就是这家2，dc_strak 不等于 0");
                    }
                }

                    // 处理"确认信息并支付"按钮
            var hidden_confirm_btn = current_webview.findOne(text("确认信息并支付").algorithm('DFS'));
                if (hidden_confirm_btn) {
                        dc_streak = 0;
                        hidden_confirm_btn.click();
                        console.info("[点击] 确认信息并支付2")
                        sleep(ignore_ack_click_delay);
                        submit_flag = false;
                        break;
                } else {
//                    console.error("[不能找到] 确认信息并支付2")
                }
            submit_flag = false;
//            console.error("submit_flag = FALSE,结束循环，dc_streak:"+dc_streak)
            break;

        case "info_page":
            submit_flag = false;
            ignore_next_purchase_page_flag = false;
            if (!rebuy_flag) {
                sleep(100);
                var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (!confirm_btn) {
                    // 检查是否有"立即购买"按钮
                    var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        buyNowBtn.click();
                        console.info("点击立即购买按钮");
                        sleep(500);
                    } else {
                        // 如果没有立即购买按钮，检查是否有"距离开售时间还剩00:00"状态
                        var prepareSaleBtn = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));

                        if (prepareSaleBtn) {
                            refresh_attempt_count++;
                            console.warn("[状态] 商品尚未发售，执行刷新操作 (第" + refresh_attempt_count + "次)");

                            // 检查刷新次数限制
                            if (refresh_attempt_count >= max_refresh_attempts) {
                                console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
                                script_status = 0;
                                ui.post(() => {
                                    w.end.attr('visibility', 'gone');
                                    w.start.attr('visibility', 'visible');
                                });
                                break;
                            }

                            performRefreshActions(current_webview);

                            // 刷新完成后立即检测是否有"立即购买"按钮
                            console.info("[检测] 刷新完成，立即检测是否有'立即购买'按钮");

                            // 等待页面加载完成
                            sleep(1000);

                            // 重新获取当前webview
                            var updated_webview = get_current_webview_fast(current_node);
                            if (updated_webview) {
                                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                if (buyNowBtn) {
                                    console.warn("[检测] 检测到'立即购买'按钮，商品已发售！");
                                    console.info("立即点击购买按钮");
                                    buyNowBtn.click();

                                    // 重置刷新计数
                                    refresh_attempt_count = 0;

                                    // 等待页面跳转
                                    sleep(500);
                                    break;
                                } else {
                                    console.info("[检测] 暂未发现'立即购买'按钮，继续等待");
                                }
                            }
                        } else {
                            // 如果没有找到任何识别的按钮，检查是否有"距离开售时间还剩00:00"
                            var prepareSaleBtn = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));

                            if (prepareSaleBtn) {
                                console.info("[检测] 发现倒计时文字，商品尚未发售，等待500ms后再次检测");
                                sleep(500);

                                // 重新获取当前webview，检查是否有"立即购买"按钮
                                var updated_webview = get_current_webview_fast(current_node);
                                if (updated_webview) {
                                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                    if (buyNowBtn) {
                                        console.warn("[检测] 等待期间检测到'立即购买'按钮，商品已发售！");
                                        console.info("立即点击购买按钮");
                                        buyNowBtn.click();

                                        // 重置刷新计数
                                        refresh_attempt_count = 0;

                                        // 等待页面跳转
                                        sleep(500);
                                        break;
                                    }
                                }
                            }

                            // 如果没有找到任何识别的按钮，进行刷新
                            console.info("未识别到购买按钮，执行刷新操作");
                            performRefreshActions(current_webview);

                            // 刷新完成后立即检测是否有"立即购买"按钮
                            sleep(1000);
                            var updated_webview = get_current_webview_fast(current_node);
                            if (updated_webview) {
                                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                if (buyNowBtn) {
                                    console.warn("[检测] 检测到'立即购买'按钮，商品已发售！");
                                    console.info("立即点击购买按钮");
                                    buyNowBtn.click();

                                    // 重置刷新计数
                                    refresh_attempt_count = 0;

                                    // 等待页面跳转
                                    sleep(500);
                                    break;
                                } else {
                                    console.info("[检测] 暂未发现'立即购买'按钮，继续等待");
                                }
                            }
                        }
                    }
                } else {
                    console.info("未能找到 确定 按钮")
                    var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                    if (!confirm_btn) {
                        rebuy_flag = false;
                    }
                    sleep(150);
                }
            } else {
                console.info("rebuy_flag 为 true,不进入匹配 确定 按钮")
            } // 修复：补充缺失的大括号，闭合 case 'info_page'
            // Acknowledge page logic
            break;
        case "prepare_sale":
            submit_flag = false;
            ignore_next_purchase_page_flag = false;

            // 检查刷新次数限制
            if (refresh_attempt_count >= max_refresh_attempts) {
                console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
                script_status = 0;
                ui.post(() => {
                    w.end.attr('visibility', 'gone');
                    w.start.attr('visibility', 'visible');
                });
                break;
            }

            // 检查是否有"距离开售时间还剩00:00"文字
            var prepareSaleBtn = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));

            if (prepareSaleBtn) {
                refresh_attempt_count++;

                console.info("发现'距离开售时间还剩00:00'文字，先等待500ms检测是否有'立即购买'按钮 (第" + refresh_attempt_count + "次)");

                // 在刷新之前先等待500ms，检测是否有"立即购买"按钮出现
                console.info("[等待] 等待500ms检测是否有'立即购买'按钮出现...");
                sleep(500);

                // 重新获取当前webview，检查是否有"立即购买"按钮
                var updated_webview = get_current_webview_fast(current_node);
                if (updated_webview) {
                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        console.warn("[成功] 🎉 等待期间检测到'立即购买'按钮，商品已发售！");
                        console.info("立即点击购买按钮，跳过刷新操作");
                        buyNowBtn.click();

                        // 重置刷新计数
                        refresh_attempt_count = 0;
                        rebuy_flag = false;

                        // 等待页面跳转
                        sleep(500);
                        break;
                    }
                }

                // 如果没有检测到"立即购买"按钮，才进行刷新操作
                console.info("[检测] 500ms内未检测到'立即购买'按钮，开始执行刷新操作");

                if (refresh_on_prepare_sale) {
                    performRefreshActions(current_webview);

                    // 刷新完成后立即检测是否有"立即购买"按钮
                    console.info("[检测] 刷新完成，立即检测是否有'立即购买'按钮");

                    // 等待页面加载完成
                    sleep(1000);

                    // 重新获取当前webview（可能已经更新）
                    var updated_webview_after_refresh = get_current_webview_fast(current_node);
                    if (updated_webview_after_refresh) {
                        var buyNowBtn = updated_webview_after_refresh.findOne(text("立即购买").algorithm('DFS'));
                        if (buyNowBtn) {
                            console.warn("[成功] 🎉 刷新后检测到'立即购买'按钮，商品已发售！");
                            console.info("立即点击购买按钮");
                            buyNowBtn.click();

                            // 重置刷新计数
                            refresh_attempt_count = 0;
                            rebuy_flag = false;

                            // 等待页面跳转
                            sleep(500);
                            break;
                        } else {
                            console.info("[检测] 刷新后暂未发现'立即购买'按钮，继续等待");
                        }
                    }
                } else {
                    console.info("[配置] 准备发售状态刷新已禁用，仅等待");
                }

                // 等待一段时间后再检查
                sleep(refresh_delay);
            } else {
                // 如果没有找到相关按钮，可能页面已经改变，重新检测
                console.info("未找到发售状态按钮，可能页面已更新或商品已发售");

                // 立即检测是否有"立即购买"按钮
                var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    console.warn("[成功] 🎉 检测到'立即购买'按钮，商品已发售！");
                    console.info("立即点击购买按钮");
                    buyNowBtn.click();

                    // 重置刷新计数
                    refresh_attempt_count = 0;
                    rebuy_flag = false;

                    // 等待页面跳转
                    sleep(500);
                    break;
                }

                refresh_attempt_count = 0; // 重置刷新计数
                sleep(200);
            }
            break;
        case "error":
            rebuy_flag = false;
            submit_flag = false;
            log("访问异常，账号被风控。");
            // text("我知道了").click();
            sleep(100);
            break;
        case "purchase":
            if (ignore_next_purchase_page_flag) {
                ignore_next_purchase_page_flag = false;
                break;
            }
            submit_flag = false;
            dc_streak = 0;
            if (!rebuy_flag) {
                // 优化的并行识别和点击逻辑
                console.info("[并行选择] 开始同时识别购买方式和规格...");

                // 并行查找购买方式和规格的相关元素
                var purchase_type_btn = null;
                var specs_btn = null;
                var purchase_found_method = "";
                var specs_found_method = "";

                // 快速扫描页面中的所有相关元素
                console.info("[并行选择] 开始快速扫描页面元素...");
                var allElements = current_webview.find(className("android.view.View").algorithm('DFS'));
                var purchase_elements = [];
                var specs_elements = [];

                for (var i = 0; i < allElements.length; i++) {
                    var element = allElements[i];
                    try {
                        var elementText = element.text();
                        if (elementText) {
                            // 检查购买方式元素
                            if (purchase_type != '来回刷' && (elementText.includes(purchase_type) || elementText.includes("送到家") || elementText.includes("到店取"))) {
                                purchase_elements.push({
                                    text: elementText,
                                    element: element,
                                    clickable: element.clickable()
                                });
                            }

                            // 检查规格元素
                            if (elementText.includes("单个") || elementText.includes("整盒") || elementText.includes("整端") || elementText.includes("盲盒")) {
                                specs_elements.push({
                                    text: elementText,
                                    element: element,
                                    clickable: element.clickable()
                                });
                            }
                        }
                    } catch (e) {
                        // 忽略错误
                    }
                }

                console.info("[并行选择] 扫描完成 - 购买方式元素: " + purchase_elements.length + " 个, 规格元素: " + specs_elements.length + " 个");

                // 并行处理购买方式选择
                if (purchase_type != '来回刷') {
                    console.info("[并行选择] 处理购买方式: " + purchase_type);

                    // 方法1: 从扫描结果中快速匹配
                    for (var i = 0; i < purchase_elements.length; i++) {
                        var element = purchase_elements[i];
                        if (element.text.includes(purchase_type)) {
                            purchase_type_btn = element.element;
                            purchase_found_method = "扫描匹配";
                            console.info("[并行选择] 购买方式扫描匹配成功: " + element.text);
                            break;
                        }
                    }

                    // 方法2: 如果扫描没找到，使用传统方法
                    if (!purchase_type_btn) {
                        purchase_type_btn = current_webview.findOne(text(purchase_type).algorithm('DFS'));
                        if (purchase_type_btn) {
                            purchase_found_method = "精确匹配";
                        } else {
                            purchase_type_btn = current_webview.findOne(textStartsWith(purchase_type).algorithm('DFS'));
                            if (purchase_type_btn) {
                                purchase_found_method = "模糊匹配";
                            }
                        }
                    }
                }

                // 并行处理规格选择
                console.info("[并行选择] 处理规格: " + specs);

                // 确定规格关键词
                var specs_keywords = [];
                if (specs === "单个") {
                    specs_keywords = ["单个", "盲盒"];
                } else if (specs === "整端") {
                    specs_keywords = ["整盒", "整端"];
                } else {
                    specs_keywords = [specs];
                }

                // 方法1: 从扫描结果中快速匹配
                for (var i = 0; i < specs_elements.length; i++) {
                    var element = specs_elements[i];
                    for (var j = 0; j < specs_keywords.length; j++) {
                        var keyword = specs_keywords[j];
                        if (element.text.includes(keyword)) {
                            specs_btn = element.element;
                            specs_found_method = "扫描匹配";
                            console.info("[并行选择] 规格扫描匹配成功: " + element.text);
                            break;
                        }
                    }
                    if (specs_btn) break;
                }

                // 方法2: 如果扫描没找到，使用传统方法
                if (!specs_btn) {
                    for (var i = 0; i < specs_keywords.length; i++) {
                        var keyword = specs_keywords[i];
                        specs_btn = current_webview.findOne(text(keyword).algorithm('DFS'));
                        if (specs_btn) {
                            specs_found_method = "精确匹配";
                            break;
                        }
                        specs_btn = current_webview.findOne(textMatches(".*" + keyword + ".*").algorithm('DFS'));
                        if (specs_btn) {
                            specs_found_method = "包含匹配";
                            break;
                        }
                    }
                }

                // 并行执行点击操作
                console.info("[并行选择] 开始执行点击操作...");

                // 点击购买方式
                if (purchase_type_btn && purchase_type != '来回刷') {
                    console.info("[并行选择] 点击购买方式，匹配方式: " + purchase_found_method);
                    try {
                        purchase_type_btn.click();
                        console.info("[并行选择] 购买方式点击成功");
                        log("已选择购买方式：" + purchase_type + " (匹配方式: " + purchase_found_method + ")");
                    } catch (e) {
                        console.error("[并行选择] 购买方式点击失败: " + e.message);
                        try {
                            var bounds = purchase_type_btn.bounds();
                            click(bounds.centerX(), bounds.centerY());
                            console.info("[并行选择] 购买方式坐标点击成功");
                        } catch (e2) {
                            console.error("[并行选择] 购买方式坐标点击也失败: " + e2.message);
                        }
                    }
                } else if (purchase_type != '来回刷') {
                    console.warn("[并行选择] 未找到购买方式按钮: " + purchase_type);
                }

                // 点击规格
                if (specs_btn) {
                    console.info("[并行选择] 点击规格，匹配方式: " + specs_found_method);
                    try {
                        specs_btn.click();
                        console.info("[并行选择] 规格点击成功");
                        log("已选择规格：" + specs + " (匹配方式: " + specs_found_method + ")");
                    } catch (e) {
                        console.error("[并行选择] 规格点击失败: " + e.message);
                        try {
                            var bounds = specs_btn.bounds();
                            click(bounds.centerX(), bounds.centerY());
                            console.info("[并行选择] 规格坐标点击成功");
                        } catch (e2) {
                            console.error("[并行选择] 规格坐标点击也失败: " + e2.message);
                        }
                    }
                } else {
                    console.warn("[并行选择] 未找到规格按钮: " + specs);
                }

                // 立即开始库存刷新，零延迟启动
                var selectionEndTime = new Date().getTime();
                console.info("[并行选择] 选择操作完成，立即开始库存刷新");

                // 同步处理通知按钮点击，避免与库存刷新循环冲突
                if (auto_click_notification) {
                    clickNotifyBtn(); // 改为同步执行，避免线程冲突
                }

                var refreshTimeStart = new Date();
                var current_selection = "到店取";

                // 立即开始查找确定按钮，零延迟
                var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));

                while (!confirm_btn && !rebuy_flag) {
                    // max duration logic
                    if (max_refresh_time > 0) {
                        var currentTime = new Date();
                        if ((currentTime - refreshTimeStart) > 1000 * 60 * max_refresh_time) {
                            if (timeout_sleep_wait_time == 0) {
                                script_status = 0;
                                ui.post(() => {
                                    w.end.attr('visibility', 'gone');
                                    w.start.attr('visibility', 'visible');
                                });
                                var seconds = parseFloat((max_refresh_time * 60).toFixed(2));
                                console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟(", seconds, "秒) ", "，脚本已停止");
                            } else {
                                console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟(", seconds, "秒) ", "，已设定睡眠时间:"+timeout_sleep_wait_time+"秒，脚本已暂停");
                                sleep(timeout_sleep_wait_time * 1000);
                                console.warn("[通知] 脚本暂停时间已过，脚本恢复");
                                refreshTimeStart = new Date();
                            }
                        }
                    }
                    // script stop logic
                    if (script_status == 0) {
                        rebuy_flag = false;
                        submit_flag = false;
                        dc_streak = 0;
                        break;
                    }
                    var check_start_time = new Date().getTime();
                    var purchase_btn = current_webview.findOne(text("立即购买").algorithm('DFS'));

                    // refresh logic
                    if (purchase_btn) {
                        confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                        if (confirm_btn) {
                            break;
                        }
                        // safe stock check logic
                        if (!rage_stock_refresh_conf) {
                            var sold_out = current_webview.findOne(text("已售罄").algorithm('DFS'));
                            var refresh_retry = 0;
                            var timeout_flag = false;
                            console.error("正在判断库存情况...");
                            while (!sold_out) {
                                refresh_retry++;
                                if (refresh_retry > 30) {
                                    timeout_flag = true;
                                    break;
                                }
                                sold_out = current_webview.findOne(text("已售罄").algorithm('DFS'));
                                if (sold_out) {
                                    break;
                                }
                                sleep(fast_mode_check_interval); // 使用快速模式检查间隔
                                confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                                if (confirm_btn) {
                                    break;
                                }
                                if (script_status == 0) {
                                    rebuy_flag = false;
                                    submit_flag = false;
                                    dc_streak = 0;
                                    break;
                                }
                            }
                            if (sold_out) {
                                console.warn("已售罄");
                            } else if (confirm_btn) {
                                console.warn("有库存");
                            }

                            // refresh logic
                            if (timeout_flag || sold_out) {
                                if (sku_result_toast_conf) {
                                    click_plus_btn(current_webview);
                                }
                                if (purchase_type != '来回刷') {
                                    if (!rebuy_flag) {
                                        purchase_btn.click();
                                    }

                                } else {
                                    var current_selection_btn = current_webview.findOne(text(current_selection).algorithm('DFS'));
                                    if (current_selection_btn) {
                                        current_selection_btn.click();
                                        if (current_selection == '到店取') {
                                            current_selection = '送到家';
                                        } else {
                                            current_selection = '到店取';
                                        }
                                        sleep(50);
                                    }
                                }
                            }
                        } else {
                            if (purchase_type != '来回刷') {
                                if (!rebuy_flag) {
                                    purchase_btn.click();
                                }
                            } else {
                                var current_selection_btn = current_webview.findOne(text(current_selection).algorithm('DFS'));
                                if (current_selection_btn) {
                                    current_selection_btn.click();
                                    if (current_selection == '到店取') {
                                        current_selection = '送到家';
                                    } else {
                                        current_selection = '到店取';
                                    }
                                    sleep(50);
                                }
                            }
                        }

                    }

                    confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                    if (confirm_btn) {
                        break;
                    }
                    // 优化刷新延迟计算
                    var random_delay = Math.floor(Math.random() * (random_refresh_delay_upper - random_refresh_delay_lower + 1)) + random_refresh_delay_lower;
                    if (enable_random_delay_conf) {
                        random_delay = 0;
                    }

                    var sleepTarget = refresh_delay + random_delay;
                    sleep(sleepTarget);
                    // 在等待前先快速检查一次确定按钮
                    confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                    if (confirm_btn) break;


                    purchase_count_label = current_webview.findOne(text("数量").algorithm('DFS'));
                    if (!purchase_count_label) {
                        break;
                    }

                    console.info("[注意] 库存刷新耗时: ", sleepTarget + 50, "ms");
                    if (confirm_btn) {
                        break;
                    }

                }
                if (script_status == 0) {
                    continue;
                }
                var purchase_count_text = current_webview.findOne(text("数量").algorithm('DFS'));
                if (purchase_count_text) {
                    satisfyPurchaseCount(current_webview, purchase_count);
                    log("已满足购买数量要求: ", purchase_count);
                }
            }

            confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
            // add retry count if not confirm_btn found for like 10 times, then disable the rebuy_flag
            if (confirm_btn) {
                confirm_btn_retry_count = 0;
                if (ignore_ack_conf) {
                    var now = new Date().getTime();
                    var elapsed = now - last_double_confirm_time;
                    if (elapsed >= special_confirm_delay) {
                        console.warn("[操作] 找到确认按钮，点击");
                        confirm_btn.click();
                        first_enter_confirm_and_buy = true;
                        rebuy_flag = true;
                        ignore_next_purchase_page_flag = true;
                    } else {
                        console.warn("[等待] 为防止反复被打回， 等待", special_confirm_delay - elapsed, "ms后点击确认");
                        sleep(special_confirm_delay - elapsed);
                        confirm_btn.click();
                        rebuy_flag = true;
                        ignore_next_purchase_page_flag = true;
                    }
                } else {
                    var now = new Date().getTime();
                    var elapsed = now - last_confirm_time;
                    if (elapsed >= 450) {
                        last_confirm_time = now;
                        confirm_btn.click();
                        rebuy_flag = true;
                        ignore_next_purchase_page_flag = true;
                    }
                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                }
                sleep(special_confirm_delay);
            } else {
                confirm_btn_retry_count++;
                if (confirm_btn_retry_count >= 10) {
                    confirm_btn_retry_count = 0;
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    ignore_next_purchase_page_flag = false;
                    break;
                }
            }
            break;
        case "purchase_ready":
            var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
            if (confirm_btn) {
                confirm_btn.click();
            }
            sleep(200);
            break;
        case "default":
            // Default logic
            break;
        case "no_webview":
            //log("No current webview found");
            break;
        default:
            //log("Unknown status: ");
            break;
    }
    // 在页面状态切换时重置hasClickedConfirmAndPay
    if (page_info.status !== "confirm_and_pay") {
        hasClickedConfirmAndPay = false;
    }
}