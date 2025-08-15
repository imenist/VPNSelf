// 文档地址：https://docs.hamibot.com/

auto.waitFor()
// auto.setMode('fast')
// auto.setFlags(['findOnUiThread']);
//console.error("[无障碍] 状态正常");

// 获取并显示屏幕尺寸信息
var screenWidth = device.width;
var screenHeight = device.height;
// console.info('[屏幕信息] 屏幕宽度: ' + screenWidth + 'px, 屏幕高度: ' + screenHeight + 'px');
// console.info('[窗口位置] 脚本将放置在屏幕右侧贴边，顶部25%位置');

const {
    delivery,
    refresh_mode_conf,
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
    script_start_immediately_conf,
    script_pause_when_success_conf,
    vibrate_time_conf,
    password_or_vibrate_conf,
    password_setting_conf,
    timeout_sleep_wait_time_conf,
    special_confirm_delay_conf,
    hide_sleep_time_conf,
    select_index_conf,
    anti_rebound_mode, //防回弹设置
} = hamibot.env;
const { onFreeTrial } = hamibot.plan;

// 默认隐藏控制台，除非明确设置为显示
if (hide_console_conf) {
    console.hide();
} else if(!hide_console_conf){
    console.show();
}
var script_status = 0;
// VARS

var purchase_type = delivery || "到店取";
var refresh_mode = refresh_mode_conf || "智能刷"; // 刷新模式：智能刷，切换刷，页面刷
var purchase_count = parseInt(purchase_count_conf) || 1;
var specs = specs_conf || "单个";
var refresh_delay = parseInt(delay_conf) || 600;
var select_index = parseInt(select_index_conf) || 1; // 选择索引配置，1代表第一个选项，2代表第二个选项，以此类推
var extra_delay = parseInt(extra_delay_conf) || 0;
var max_refresh_time = parseFloat(max_refresh_time_conf) || 0;
var auto_click_notification = auto_click_notification_conf || false;
var random_refresh_delay_lower = Math.max(parseInt(random_delay_lower_conf) || 10, 1);
var random_refresh_delay_upper = Math.max(parseInt(random_delay_upper_conf) || 50, 1);
var main_window_alpha = Math.min(Math.max(parseFloat(main_window_alpha_conf) || 1.0, 0.0), 1.0);
var ignore_ack_click_delay = parseInt(ignore_ack_click_delay_conf) || 200;
var ignore_ack_click_confirm_delay = parseInt(ignore_ack_click_confirm_delay_conf) || 800;
var last_double_confirm_time = 0;
var last_confirm_time = 0;
var vibrate_time = (vibrate_time_conf !== null && vibrate_time_conf !== undefined && vibrate_time_conf !== '' && !isNaN(parseInt(vibrate_time_conf))) ? parseInt(vibrate_time_conf) : 3000;
var password_or_vibrate = password_or_vibrate_conf || "震动(不设置密码)";
var password_setting = parseInt(password_setting_conf) || 123456;
var timeout_sleep_wait_time = parseInt(timeout_sleep_wait_time_conf) || 0;
var special_confirm_delay = parseInt(special_confirm_delay_conf) || 400;
var ignore_ack_conf = true;
var hide_sleep_time = parseFloat(hide_sleep_time_conf) || 0;

// 定时器配置 - 脚本自动结束时间（分钟）
var script_auto_exit_time_conf = hamibot.env.script_auto_exit_time_conf;
var script_auto_exit_time = parseInt(script_auto_exit_time_conf) || 1440; // 默认1440分钟（24小时）后自动退出
var script_start_time = 0; // 脚本启动时间戳
var last_timer_display_minute = 0; // 上次显示定时器信息的时间（分钟）

// 快速模式配置 - 减少各种延迟时间
var fast_mode = true; // 默认启用快速模式
var fast_mode_main_loop_delay = fast_mode ? 5 : 10; // 主循环延迟
var fast_mode_stop_delay = fast_mode ? 10 : 20; // 停止时延迟
var fast_mode_check_interval = fast_mode ? 5 : 10; // 检查间隔
var fast_mode_selection_delay = fast_mode ? 0 : 50; // 选择后延迟

// 刷新相关配置
var confirmButtonExecuted = false; //标记是否已执行确认按钮逻辑
var refresh_on_prepare_sale = true; // 是否在准备发售状态下自动刷新
var purchase_type_btne_click = false; //标记是否已经点击过购买方式按钮
var max_refresh_attempts = 50; // 最大刷新尝试次数
var refresh_attempt_count = 0; // 当前刷新尝试次数
var start_time = 0;

// 支付线程相关变量 (参考 JS_hongzhong.js)
var paymentThread = null;
var paymentStartFlag = false;
var isRunning = false;

// === 线程协调标志位系统 ===
var isPaymentProcessing = false; // 支付线程是否正在处理
var shouldMainThreadPause = false; // 主线程是否应该暂停处理
var paymentCompleted = false; // 支付是否完成
var lastPaymentPageDetectTime = 0; // 上次检测到支付页面的时间
var paymentProcessStartTime = 0; // 支付处理开始时间

// === 支付线程执行计数器 ===
var paymentProcessAttemptCount = 0; // 支付线程执行次数
var paymentProcessMaxAttempts = 3; // 最大尝试次数
var useCoordinateClickForConfirm = false; // 是否使用坐标点击确定按钮
var Clickedcount = 0; // 点击计数器，用于控制确定按钮点击间隔


// === 坐标缓存系统 (参考 JS_hongzhong.js) ===
var cached_confirm_info_coords = null; // 缓存"确认信息并支付"按钮坐标
var cached_double_confirm_coords = null; // 缓存"确认无误"按钮坐标
var cached_double_exactly_coords = null; // 缓存"就是这家"按钮坐标
var calibration_status = {
    confirm_info: false,
    double_confirm: false,
    double_exactly: false
};

// 预计算坐标对象
var precomputedCoords = {
    confirm_info: { x: 0, y: 0 },
    double_confirm: { x: 0, y: 0 },
    double_exactly: { x: 0, y: 0 }
};

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

// === 初始化坐标缓存系统 ===
//console.info('[坐标缓存] 正在加载已保存的坐标...');
loadCoordinatesFromStorage();

// 初始化时检查校准状态
if (!calibration_status.confirm_info || !calibration_status.double_confirm || !calibration_status.double_exactly) {
    // 只显示弹窗提示，用户点击确定即可
    dialogs.alert('校准提示', '请先完成按钮校准后再启动脚本\n\n请在脚本中点击  【设置】 ，并找到  【校准按钮】  点击，并按照文字信息对应页面按钮逐一校准');
}

var storage = storages.create('GITPOP');
var w = floaty.window(
    <vertical id="main_window" w="56" h="251">
<img id="custom_image" src="https://i.imgs.ovh/2025/08/11/EXg6O.jpeg" w="56" h="14" marginBottom="3"/>
<horizontal>
<button id="move_start" text="长按移动" bg="#ffffff" w="56" h="25" visibility="visible" marginBottom="5" textSize="10sp" padding="0" />
</horizontal>
<button id="delivery_type" text={purchase_type} bg="#0f57f7" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<button id="purchase_count_btn" text={"数量: " + purchase_count} bg="#65a56d" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<button id="settings" text="设置" bg="#000000" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<horizontal>
<button id="start" text="开始" bg="#E83828" w="56" h="45" visibility="visible" textSize="12sp"/>
<button id="end" text="停止" bg="#f9ca5e" w="56" h="45" visibility="gone" textSize="12sp" />
</horizontal >
</vertical>
);

w.main_window.attr('alpha', main_window_alpha);

// 圆角按钮工具与初始化
function dp(value) {
    return Math.floor(value * (context.getResources().getDisplayMetrics().density));
}
function setRoundedBg(view, colorHex, radiusDp) {
    try {
        var drawable = new android.graphics.drawable.GradientDrawable();
        drawable.setColor(colors.parseColor(colorHex));
        drawable.setCornerRadius(dp(radiusDp || 6));
        view.setBackground(drawable);
    } catch (e) {}
}
// 初始化所有按钮为圆角背景
setRoundedBg(w.move_start, '#ffffff', 6);
setRoundedBg(w.delivery_type, (purchase_type === '送到家') ? '#E83828' : '#0f57f7', 6);
setRoundedBg(w.purchase_count_btn, '#65a56d', 6);
setRoundedBg(w.settings, '#000000', 6);
setRoundedBg(w.start, '#E83828', 6);
setRoundedBg(w.end, '#f9ca5e', 6);

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
//        console.info('[坐标系统] 已加载确认信息按钮坐标: (' + cached_confirm_info_coords.x + ', ' + cached_confirm_info_coords.y + ')');
    } else {
//        console.info('[坐标系统] 暂无存储的确认信息按钮坐标，首次识别时将自动存储');
    }

    // 检查并加载确认无误按钮坐标到全局变量
    cached_double_confirm_coords = storage.get("double_confirm_btn_coords");
    if (cached_double_confirm_coords) {
//        console.info('[坐标系统] 已加载确认无误按钮坐标: (' + cached_double_confirm_coords.x + ', ' + cached_double_confirm_coords.y + ')');
    } else {
//        console.info('[坐标系统] 暂无存储的确认无误按钮坐标，首次识别时将自动存储');
    }

        // 检查并加载按钮坐标到全局变量
        cached_double_exactly_coords = storage.get("double_exactly_btn_coords");
        if (cached_double_exactly_coords) {
    //        console.info('[坐标系统] 已加载就是这家按钮坐标: (' + cached_double_exactly_coords.x + ', ' + cached_double_exactly_coords.y + ')');
        } else {
    //        console.info('[坐标系统] 暂无存储的就是这家按钮坐标，首次识别时将自动存储');
        }
}

// 初始化时显示一次，延迟确保悬浮窗完全加载
updateParamSummary();
//存储storage
updateStorage();

// 初始化定时器 - 脚本自带功能，用户无需知道
if (script_auto_exit_time > 0) {
    //console.info("[定时器] 脚本将在 " + script_auto_exit_time + " 分钟后自动退出");
    // 记录脚本启动时间
    script_start_time = new Date().getTime();
}

function start() {
    // 检查校准状态
    if (!calibration_status.confirm_info || !calibration_status.double_confirm || !calibration_status.double_exactly) {
        // 停止脚本
        script_status = 0;

        // 先显示弹窗提示，等待用户点击确定后再执行后续操作
        dialogs.alert('校准提示', '❌ 检测到按钮坐标未校准，请先完成按钮校准后再启动脚本')
            .then(function() {
                // 用户点击确定后，自动打开设置菜单中的校准按钮子菜单
                var items = Object.keys(settingsConfig);
                var calibrateButtonIndex = items.indexOf('校准按钮');
                if (calibrateButtonIndex >= 0) {
                    var selectedItem = items[calibrateButtonIndex];
                    var config = settingsConfig[selectedItem];
                    showSubmenuSetting(selectedItem, config);
                } else {
                    // 如果找不到校准按钮，则显示普通设置菜单
                    showSettingsMenu();
                }
            })
            .catch(function() {
                // 如果弹窗被取消，也执行相同的操作
                var items = Object.keys(settingsConfig);
                var calibrateButtonIndex = items.indexOf('校准按钮');
                if (calibrateButtonIndex >= 0) {
                    var selectedItem = items[calibrateButtonIndex];
                    var config = settingsConfig[selectedItem];
                    showSubmenuSetting(selectedItem, config);
                } else {
                    // 如果找不到校准按钮，则显示普通设置菜单
                    showSettingsMenu();
                }
            });

        return;
    }

    script_status = 1;
    start_time = new Date().getTime();
    script_start_time = new Date().getTime(); // 记录脚本启动时间用于定时器

    // === 重置支付线程执行计数器 ===
    paymentProcessAttemptCount = 0;
    useCoordinateClickForConfirm = false;

    w.end.attr('visibility', 'visible');

    // 显示定时器信息
    if (script_auto_exit_time > 0) {
        //console.info("[定时器] 脚本将在 " + script_auto_exit_time + " 分钟后自动退出");
    }
    w.start.attr('visibility', 'gone');
    w.delivery_type.attr('visibility', 'gone');
    w.purchase_count_btn.attr('visibility', 'gone');
    w.settings.attr('visibility', 'gone');
    w.move_start.attr('visibility', 'gone');

    // 调整main_window高度为14+3+45=62
    w.main_window.attr('h', '62');
}

function stop() {
    script_status = 0;
    // 重置定时器
    script_start_time = 0;
    last_timer_display_minute = 0;
    confirmButtonExecuted = false; // 标记是否已执行确认按钮逻辑

    w.end.attr('visibility', 'gone');
    w.start.attr('visibility', 'visible');
    w.delivery_type.attr('visibility', 'visible');
    w.purchase_count_btn.attr('visibility', 'visible');
    w.settings.attr('visibility', 'visible');
    w.move_start.attr('visibility', 'visible');

    // 恢复main_window原始高度
    w.main_window.attr('h', '251');
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
        setRoundedBg(w.delivery_type, '#E83828', 6); // 红色
    } else {
        setRoundedBg(w.delivery_type, '#0f57f7', 6); // 蓝色
    }
    toast('配送方式已切换为: ' + purchase_type);
});

// 初始化时设置按钮颜色
if (purchase_type === '送到家') {
    setRoundedBg(w.delivery_type, '#E83828', 6);
} else {
    setRoundedBg(w.delivery_type, '#0f57f7', 6);
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
    '刷新模式': {
    type: 'choice',
    options: ['智能刷', '切换刷', '页面刷'],
    value: () => refresh_mode,
    setValue: (val) => {
    refresh_mode = val;
    storage.put('s_refresh_mode', refresh_mode);
    console.info("[模式更新] 刷新模式:" + val);
}
},
    '购买规格': {
    type: 'choice',
    options: ['单个', '整端'],
    value: () => specs,
    setValue: (val) => {
    specs = val;
    storage.put('s_specs', specs);
    console.info("[规格更新] 购买规格:" + val);
}
},
    '特殊款选项': {
    type: 'input',
    inputType: 'text',
    value: () => select_index.toString(),
    setValue: (val) => {
    if (val) {
    select_index = parseInt(val);
    storage.put('s_select_index', select_index);
}
    console.info("[选项更新] 特殊款选项: " + val);
}
},
    '库存刷新间隔(ms)': {
    type: 'input',
    inputType: 'number',
    value: () => refresh_delay.toString(),
    setValue: (val) => {
    var num = parseInt(val);
    var min = 300; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
    refresh_delay = num;
    storage.put('s_refresh_delay', num);
    console.info("[参数更新] 库存刷新间隔:" + num + "ms");
}
},
    '确认信息并支付点击后等待时间(ms)': {
    type: 'input',
    inputType: 'number',
    value: () => ignore_ack_click_delay.toString(),
    setValue: (val) => {
    var num = parseInt(val);
    var min = 100; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
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
    var min = 150; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
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
    var min = 200; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
    special_confirm_delay = num;
    storage.put('s_special_confirm_delay', num);
    console.error("[本地参数更新(优先本地)] 点击确定按钮后等待时间:" + num + "ms");
}
},
    '支付密码': {
    type: 'input',
    inputType: 'text',
    value: () => password_setting.toString(),
    setValue: (val) => {
    if (password_or_vibrate === "震动(不设置密码)") {
        toast("请在控制台选择自动输入密码后再设置");
        return; // 当设置为震动模式时不执行密码设置
    }
    if (val) {
    password_setting = parseInt(val);
    storage.put('s_password_setting', '******');
}
    console.info("[参数更新] 支付密码" );
}
},
    '校准按钮': {
        type: 'submenu',
        description: '校准各种按钮的坐标',
        submenu: function() {
            var submenuItems = {};

            // 动态生成菜单项名称
            var confirmInfoName = calibration_status.confirm_info ? '校准[确认信息并支付]按钮✔️' : '校准[确认信息并支付]按钮❌';
            var doubleExactlyName = calibration_status.double_exactly ? '校准[就是这家]按钮✔️' : '校准[就是这家]按钮❌';
            var doubleConfirmName = calibration_status.double_confirm ? '校准[确认无误]按钮✔️' : '校准[确认无误]按钮❌';

            submenuItems[confirmInfoName] = {
                type: 'action',
                description: '定位"确认信息并支付"按钮坐标',
                action: function() {
                    toast('请导航到订单确认页面，然后点击确定');
                    threads.start(() => {
                        calibrateButton('确认信息并支付', 'confirm_info');
                    });
                }
            };

            submenuItems[doubleExactlyName] = {
                type: 'action',
                description: '定位"就是这家"按钮坐标',
                action: function() {
                    toast('请导航到地址确认页面，然后点击确定');
                    threads.start(() => {
                        calibrateButton('就是这家', 'double_exactly');
                    });
                }
            };

            submenuItems[doubleConfirmName] = {
                type: 'action',
                description: '定位"确认无误"按钮坐标',
                action: function() {
                    toast('请导航到地址确认页面，然后点击确定');
                    threads.start(() => {
                        calibrateButton('确认无误', 'double_confirm');
                    });
                }
            };
            return submenuItems;
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

    // 根据password_or_vibrate的值过滤设置项
    if (password_or_vibrate === "震动(不设置密码)") {
        items = items.filter(function(item) {
            return item !== '支付密码';
        });
    }

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
            } else if (config.type === 'submenu') {
                showSubmenuSetting(selectedItem, config);
            }
        });
}

// 处理选择类型设置（三级页面）
function showChoiceSetting(itemName, config, callback) {
    var currentIdx = config.options.indexOf(config.value());
    dialogs.singleChoice(itemName, config.options, currentIdx)
        .then(function(selectedIdx) {
            if (selectedIdx >= 0) {
                config.setValue(config.options[selectedIdx]);
                updateParamSummary();
                toast(itemName + ' 已设置为: ' + config.options[selectedIdx]);
            }
            // 设置完成后根据是否有回调函数决定返回路径
            if (callback && typeof callback === 'function') {
                callback();
            } else {
                showSettingsMenu();
            }
        });
}

// 处理输入类型设置（三级页面）
function showInputSetting(itemName, config, callback) {
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
            // 设置完成后根据是否有回调函数决定返回路径
            if (callback && typeof callback === 'function') {
                callback();
            } else {
                showSettingsMenu();
            }
        });
}

// 处理操作类型设置（三级页面）
function showActionSetting(itemName, config, callback) {
    try {
        config.action();
        //console.info("[设置操作] " + itemName + " 执行成功");
        // 执行成功后根据是否有回调函数决定返回路径
        if (callback && typeof callback === 'function') {
            callback();
        }
    } catch (e) {
        toast('操作执行失败: ' + e.message);
        //console.error("[设置操作] " + itemName + " 执行失败: " + e.message);
        // 如果执行失败，则返回设置菜单
        if (callback && typeof callback === 'function') {
            callback();
        } else {
            showSettingsMenu();
        }
    }
}

// 处理子菜单类型设置（三级页面）
function showSubmenuSetting(itemName, config) {
    // 处理动态生成的子菜单
    var submenuItems;
    if (typeof config.submenu === 'function') {
        submenuItems = config.submenu();
    } else {
        submenuItems = config.submenu;
    }

    var submenuKeys = Object.keys(submenuItems);
    dialogs.select(itemName, submenuKeys)
        .then(function(subItemIdx) {
            if (subItemIdx < 0) {
                // 返回上级菜单
                showSettingsMenu();
                return;
            }
            var selectedSubItem = submenuKeys[subItemIdx];
            var subConfig = submenuItems[selectedSubItem];

            // 处理子菜单中的不同类型
            if (subConfig.type === 'choice') {
                showChoiceSetting(selectedSubItem, subConfig, function() {
                    // 操作完成后直接关闭设置菜单
                    return;
                });
            } else if (subConfig.type === 'input') {
                showInputSetting(selectedSubItem, subConfig, function() {
                    // 操作完成后直接关闭设置菜单
                    return;
                });
            } else if (subConfig.type === 'action') {
                showActionSetting(selectedSubItem, subConfig, function() {
                    // 操作完成后直接关闭设置菜单
                    return;
                });
            }
        });
}

// === 坐标校准系统 (参考 JS_hongzhong.js) ===

// 更新预计算坐标
function updatePrecomputedCoords() {
    if (cached_confirm_info_coords && cached_confirm_info_coords.length >= 4) {
        precomputedCoords.confirm_info.x = cached_confirm_info_coords[0] + (cached_confirm_info_coords[2] - cached_confirm_info_coords[0]) / 2;
        precomputedCoords.confirm_info.y = cached_confirm_info_coords[1] + (cached_confirm_info_coords[3] - cached_confirm_info_coords[1]) / 2;
    }
    if (cached_double_confirm_coords && cached_double_confirm_coords.length >= 4) {
        precomputedCoords.double_confirm.x = cached_double_confirm_coords[0] + (cached_double_confirm_coords[2] - cached_double_confirm_coords[0]) / 2;
        precomputedCoords.double_confirm.y = cached_double_confirm_coords[1] + (cached_double_confirm_coords[3] - cached_double_confirm_coords[1]) / 2;
    }
    if (cached_double_exactly_coords && cached_double_exactly_coords.length >= 4) {
        precomputedCoords.double_exactly.x = cached_double_exactly_coords[0] + (cached_double_exactly_coords[2] - cached_double_exactly_coords[0]) / 2;
        precomputedCoords.double_exactly.y = cached_double_exactly_coords[1] + (cached_double_exactly_coords[3] - cached_double_exactly_coords[1]) / 2;
    }

    //console.info('[坐标缓存] 预计算坐标已更新');
   // console.info('[坐标缓存] 确认信息并支付: (' + precomputedCoords.confirm_info.x + ', ' + precomputedCoords.confirm_info.y + ')');
   // console.info('[坐标缓存] 确认无误: (' + precomputedCoords.double_confirm.x + ', ' + precomputedCoords.double_confirm.y + ')');
    //console.info('[坐标缓存] 就是这家: (' + precomputedCoords.double_exactly.x + ', ' + precomputedCoords.double_exactly.y + ')');
}

// 校准按钮坐标 (通用函数)
function calibrateButton(buttonTextArray, buttonType) {
    //console.info('[坐标校准] 开始定位按钮: ' + JSON.stringify(buttonTextArray) + ', 类型: ' + buttonType);

    try {
        var targetElement = null;
        var foundText = '';

        // 支持数组形式的按钮文本
        if (Array.isArray(buttonTextArray)) {
            for (var i = 0; i < buttonTextArray.length; i++) {
                targetElement = className('android.widget.TextView').text(buttonTextArray[i]).findOne(3000);
                if (targetElement) {
                    foundText = buttonTextArray[i];
                    break;
                }
            }
        } else {
            targetElement = className('android.widget.TextView').text(buttonTextArray).findOne(3000);
            foundText = buttonTextArray;
        }

        if (targetElement) {
            var bounds = targetElement.bounds();
            var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];

            if (buttonType === 'confirm_info') {
                cached_confirm_info_coords = coords;
                calibration_status.confirm_info = true;
            } else if (buttonType === 'double_confirm') {
                cached_double_confirm_coords = coords;
                calibration_status.double_confirm = true;
            } else if (buttonType === 'double_exactly') {
                cached_double_exactly_coords = coords;
                calibration_status.double_exactly = true;
            }

            updatePrecomputedCoords();

            console.info('[按钮校准] "' + foundText + '" 按钮定位成功');
            toast('"' + foundText + '" 按钮定位成功');

            // 保存到本地存储
            saveCoordinatesToStorage();

        } else {
            var displayText = Array.isArray(buttonTextArray) ? buttonTextArray.join('或') : buttonTextArray;
            console.warn('[按钮校准] 未找到 "' + displayText + '" 按钮');
            toast('未找到 "' + displayText + '" 按钮，请确保在正确页面');
        }
    } catch (e) {
        console.error('[按钮校准] 定位按钮时发生错误: ' + e);
        toast('定位失败: ' + e);
    }
}

// 保存坐标到本地存储
function saveCoordinatesToStorage() {
    try {
        if (cached_confirm_info_coords) {
            storages.create("coordinate_cache").put("confirm_info_coords", JSON.stringify(cached_confirm_info_coords));
        }
        if (cached_double_confirm_coords) {
            storages.create("coordinate_cache").put("double_confirm_coords", JSON.stringify(cached_double_confirm_coords));
        }
        if (cached_double_exactly_coords) {
            storages.create("coordinate_cache").put("double_exactly_coords", JSON.stringify(cached_double_exactly_coords));
        }
        storages.create("coordinate_cache").put("calibration_status", JSON.stringify(calibration_status));
        console.info('[校准缓存] 已存储');
    } catch (e) {
        console.error('[校准缓存] 存储失败: ' + e);
    }
}

// 从本地存储加载坐标
function loadCoordinatesFromStorage() {
    try {
        var storage = storages.create("coordinate_cache");

        var confirmInfoCoordsStr = storage.get("confirm_info_coords");
        if (confirmInfoCoordsStr) {
            cached_confirm_info_coords = JSON.parse(confirmInfoCoordsStr);
        }

        var doubleConfirmCoordsStr = storage.get("double_confirm_coords");
        if (doubleConfirmCoordsStr) {
            cached_double_confirm_coords = JSON.parse(doubleConfirmCoordsStr);
        }

        var doubleExactlyCoordsStr = storage.get("double_exactly_coords");
        if (doubleExactlyCoordsStr) {
            cached_double_exactly_coords = JSON.parse(doubleExactlyCoordsStr);
        }

        var calibrationStatusStr = storage.get("calibration_status");
        if (calibrationStatusStr) {
            calibration_status = JSON.parse(calibrationStatusStr);
        }

        updatePrecomputedCoords();
        //console.info('[校准缓存] 已从存储加载');

    } catch (e) {
        console.warn('[校准缓存] 加载失败: ' + e);
    }
}

// 使用坐标快速点击
function clickByCoordinates(buttonType) {
    try {
        var x, y;
        if (buttonType === 'confirm_info' && calibration_status.confirm_info) {
            x = precomputedCoords.confirm_info.x;
            y = precomputedCoords.confirm_info.y;
            //console.info('[坐标点击] 使用缓存坐标点击信息并支付按钮: (' + x + ', ' + y + ')');
        } else if (buttonType === 'double_confirm' && calibration_status.double_confirm) {
            x = precomputedCoords.double_confirm.x;
            y = precomputedCoords.double_confirm.y;
            //console.info('[坐标点击] 使用缓存坐标点击确认无误按钮: (' + x + ', ' + y + ')');
        } else if (buttonType === 'double_exactly' && calibration_status.double_exactly) {
            x = precomputedCoords.double_exactly.x;
            y = precomputedCoords.double_exactly.y;
           // console.info('[坐标点击] 使用缓存坐标点击就是这家按钮: (' + x + ', ' + y + ')');
        } else {
           // console.warn('[坐标点击] 坐标未校准，无法使用坐标点击: ' + buttonType);
            return false;
        }
        press(x, y, 20); // 使用20ms的短按
        return true;

    } catch (e) {
        console.error('[点击] 缓存点击失败: ' + e);
        return false;
    }
}

//点击x关闭方式来刷新
var lastPageCloseRefreshTime = 0;
var pageCloseRefreshCooldown = 1000;

//点击x关闭方式来刷新
function pageCloseRefresh() {
    // 防重复点击检查
    var currentTime = Date.now();
    if (currentTime - lastPageCloseRefreshTime < pageCloseRefreshCooldown) {
        console.warn("⏰ 页面刷新冷却中，跳过本次调用（距离上次 " + (currentTime - lastPageCloseRefreshTime) + "ms）");
        return;
    }

    lastPageCloseRefreshTime = currentTime;
    console.info("开始搜索关闭按钮...");

    // 第一步：找到indexInParent=2的android.view.View容器
    var allViews = current_webview.find(className("android.view.View").algorithm('DFS'));
    console.info("找到View总数量: " + allViews.length);

    var targetContainer = null;
    var targetIndex = 2; // indexInParent = 2

    for (var i = 0; i < allViews.length; i++) {
        try {
            var view = allViews[i];
            if (view && view.indexInParent() === targetIndex) {
                var bounds = view.bounds();
                console.info("找到indexInParent=2的View[" + i + "] 坐标:(" + bounds.left + "," + bounds.top + "," + bounds.right + "," + bounds.bottom + ")");
                targetContainer = view;
                break;
            }
        } catch (e) {
            // 忽略错误
        }
    }


    var containerBounds = targetContainer.bounds();
    var containerImages = targetContainer.find(className("android.widget.Image").algorithm('DFS'));
    console.info("容器内找到Image数量: " + containerImages.length);

    var bestImage = null;
    var maxRight = 0; // 找最右边的Image
    var maxTop = containerBounds.bottom; // 找最上面的Image

    for (var j = 0; j < containerImages.length; j++) {
        try {
            var image = containerImages[j];
            if (image) {
                var imgBounds = image.bounds();
                console.info("容器内Image[" + j + "] 坐标:(" + imgBounds.left + "," + imgBounds.top + "," + imgBounds.right + "," + imgBounds.bottom + ")");

                // 选择最右上角的Image（x坐标最大，y坐标最小）
                if (imgBounds.right >= maxRight && imgBounds.top <= maxTop) {
                    maxRight = imgBounds.right;
                    maxTop = imgBounds.top;
                    bestImage = image;
                    console.info("🎯 更新最佳候选Image[" + j + "] 右边界:" + maxRight + " 上边界:" + maxTop);
                }
            }
        } catch (e) {
            // 忽略错误
        }
    }

    if (bestImage) {
        var imgBounds = bestImage.bounds();
        console.info("Image坐标:(" + imgBounds.left + "," + imgBounds.top + "," + imgBounds.right + "," + imgBounds.bottom + ")");
        console.info("容器坐标:(" + containerBounds.left + "," + containerBounds.top + "," + containerBounds.right + "," + containerBounds.bottom + ")");

        // 确保点击坐标在容器范围内，点击容器右上角区域
        var clickX = containerBounds.right - 50; // 容器右边界内50像素
        var clickY = containerBounds.top + 50; // 容器上边界下50像素

        console.info("准备点击容器右上角区域（往左下50像素）...");

        try {
            console.info("尝试点击坐标:(" + clickX + "," + clickY + ")");
            click(clickX, clickY);
            console.info("✅ 成功点击容器右上角坐标");
        } catch (e) {
            console.error("坐标点击失败: " + e.message);
        }
    } else {
        // 容器内没找到Image，点击容器的右上角区域
        console.warn("容器内未找到Image，点击容器右上角区域");
        var containerRightX = containerBounds.right - 20; // 离容器右边界20像素
        var containerTopY = containerBounds.top + 20; // 离容器上边界20像素
        console.info("点击容器右上角坐标:(" + containerRightX + "," + containerTopY + ")");

        try {
            click(containerRightX, containerTopY);
            console.info("✅ 容器右上角坐标点击成功");
        } catch (e) {
            console.error("容器右上角坐标点击失败: " + e.message);
        }
    }
}

// 获取确定按钮坐标并点击
function clickConfirmButtonByCoordinates(confirm_btn) {
    try {
        if (!confirm_btn) {
            //console.warn("[坐标点击] 确定按钮为空，无法获取坐标");
            return false;
        }

        var bounds = confirm_btn.bounds();
        var centerX = bounds.centerX();
        var centerY = bounds.centerY();

        //console.info("[点击] 激活确定按钮XY");
        press(centerX, centerY, 20); // 使用20ms的短按
        return true;

    } catch (e) {
        console.error('[点击] 激活确定按钮点击失败: ' + e);
        return false;
    }
}

w.settings.click(function () {
    'ui';
    showSettingsMenu();
});

// 计算窗口位置：右侧贴边，顶部25%位置
var uiWidth = 56; // UI宽度
var posX = storage.get('floaty_position_x');
var posY = storage.get('floaty_position_y');
var defaultX = screenWidth  - uiWidth*3; // 右侧贴边，预留UI宽度
var defaultY = Math.floor(screenHeight * 0.25); // 顶部25%位置

// 检查保存的位置是否有效，如果无效则使用默认位置
if (typeof posX === 'number' && typeof posY === 'number' && posX >= 0 && posX + uiWidth <= screenWidth && posY >= 0 && posY <= screenHeight) {
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

function clickButton(button) {
    var bounds = button.bounds();
    var centerX = bounds.centerX();
    var centerY = bounds.centerY();
    click(centerX, centerY);
}

function get_current_node(webview_parent_node) {
    // 添加null检查
    if (!webview_parent_node) {
        return null;
    }

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
    //console.info("check_current_page_tree")
    if (!current_webview) {
        return { header: header_text, status: "no_webview" };
    }
    if (header_text === "确认订单" || header_text === "访问异常，请稍后重试") {
        return { header: header_text, status: "confirm_and_pay" };
    } else if (header_text == "" || header_text != "no_header") {
        var startTime = Date.now();
        var button_parent = find_button_parent(current_webview);
        if (button_parent) {
            return { header: header_text, status: "purchase" };
        }

        if (Date.now() - startTime > 20) {
            return { header: header_text, status: "default" };
        }

        // 检查是否有"立即购买"按钮
        var info_page_last_button = find_info_page_last_button(current_webview);
        if (info_page_last_button && info_page_last_button.text() == "立即购买") {
            rebuy_flag = false;
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

        if (className('android.widget.TextView').text('自提门店列表').exists()){
           //console.info("自提门店列表");
           return { header: header_text, status: "back" };
        }

        return { header: header_text, status: "default" };
    } else {
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

function find_info_page_last_button(current_webview) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        return null;
    }

    if (last_view.childCount() != 1 && last_view.childCount() != 2) {
        if (debug_mode_conf) {
            log("last_view error: " + last_view.childCount());
        }
        return null;
    }

    var last_child = last_view.child(last_view.childCount() - 1); // get last child of last_view
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }

    // get last child of last_child
    // make sure it has at least one child
    if (last_child.childCount() < 1) {
        if (debug_mode_conf) {
            log("last_child does not have at least one child");
        }
        return null;
    }
    // get last child of last_child
    var last_child_last_child = last_child.child(last_child.childCount() - 1);
    if (!last_child_last_child || last_child_last_child.className() !== "android.widget.TextView") {
        if (debug_mode_conf) {
            log("last_child_last_child is null or not android.widget.TextView");
        }
        return null;
    }

    return last_child_last_child;
}

function find_button_parent(current_webview) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        sleep(30);
        return null;
    }
    // always check for childCount before accessing children
    // make sure it has two children
    if (last_view.childCount() < 2) {
        if (debug_mode_conf) {
            log("last_view has less than 2 children");
        }
        return null;
    }
    // get the last child of last_view, and make sure it is view
    var last_child = last_view.child(last_view.childCount() - 1);
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child.childCount() != 1) {
        if (debug_mode_conf) {
            log("last_child does not have exactly 1 child");
        }
        return null;
    }
    // make the last_child its 0 child
    var last_child_0 = last_child.child(0);
    if (!last_child_0 || last_child_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0 is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child_0.childCount() != 1) {
        if (debug_mode_conf) {
            log("last_child_0 does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0_0 = last_child_0.child(0);
    if (!last_child_0_0 || last_child_0_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0 is null or not android.view.View");
        }
        return null;
    }
    // make sure it has three children and the last one is a view
    if (last_child_0_0.childCount() != 3) {
        if (debug_mode_conf) {
            log("last_child_0_0 does not have exactly 3 children");
        }
        return null;
    }
    var last_child_0_0_2 = last_child_0_0.child(2);
    if (!last_child_0_0_2 || last_child_0_0_2.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0_2 is null or not android.view.View");
        }
        return null;
    }
    return last_child_0_0_2;
}

function find_confirm_btn(current_webview) {
    var last_child_0_0_2 = find_button_parent(current_webview);
    if (!last_child_0_0_2) {
        return null;
    }

    // if last_child_0_0_2 has one child, get it, check for null and make see if its text is "确定", if it is return that child, otherwise return null
    if (last_child_0_0_2.childCount() == 1) {
        var child = last_child_0_0_2.child(0);
        if (child && child.text() == "确定") {
            return child;
        }
    }
    return null;
}

function is_empty_stock(current_webview) {
    var last_child_0_0_2 = find_button_parent(current_webview);
    if (!last_child_0_0_2) {
        return null;
    }

    // if last_child_0_0_2 has one child, get it, check for null and make see if its text is "确定", if it is return that child, otherwise return null
    if (last_child_0_0_2.childCount() >= 2) {
        return true;
    } else if (last_child_0_0_2.childCount() == 1) {
        var child = last_child_0_0_2.child(0);
        if (child && child.text() == "该渠道暂不发售") {
            return true;
        }
    }
    return false;
}

// STATE VARIABLES - These need to be reset when script_status = 0
var rebuy_flag = false;
var submit_flag = false;
var confirm_btn_retry_count = 0;
var ignore_next_purchase_page_flag = false;


var dc_streak = 0;
var payment_page_confirm_btn_retry_count = 0;
var tried_clicked_confirm_to_pay_page_count = 0;

var defaultInterval = 150;

var submited_refresh_flag = false;
var submited_refresh_count = 0;

function safeClickByText(_0x222437,_0x407a0d){
	var _0xb64220=_0x222437.text(_0x407a0d).findOne(500);
	if(_0xb64220){
		_0xb64220.click();
		return true;
	}
	return false;
}

// 支付流程函数 (参考 JS_hongzhong.js 的 _0x5eefae 函数)
function startPaymentProcess() {

    // === 设置线程协调状态 ===
    isPaymentProcessing = true;
    shouldMainThreadPause = true;
    paymentCompleted = false;
    paymentProcessStartTime = Date.now();

    // === 增加执行计数器 ===
    paymentProcessAttemptCount++;
    //console.info("[支付线程] 第" + paymentProcessAttemptCount + "次执行支付流程");

    //console.info('[线程协调] 支付线程已接管页面处理，主线程暂停');
    //console.info('isRunning'+isRunning+'paymentThread:'+paymentThread+'!isInterrupted:'+!paymentThread.isInterrupted());

        // === 支付流程主循环 ===
    if (isRunning && paymentThread && !paymentThread.isInterrupted()) {
            // 核心判断：检查是否还在确认订单页面

            // 1. 优先使用坐标点击 "确认信息并支付" 按钮（极速模式）
            if (calibration_status.confirm_info) {
                clickByCoordinates('confirm_info');
//                press(precomputedCoords.confirm_info.x, precomputedCoords.confirm_info_y, 20);
//                console.info("[坐标点击] 使用缓存坐标点击 确认信息并支付");
                  console.error("[点击] 确认信息并支付1");
                sleep(ignore_ack_click_delay);

            }

            // 根据购买类型选择不同的确认按钮
            if (purchase_type === '送到家') {
                clickByCoordinates('double_confirm');
//                press(precomputedCoords.double_confirm.x, precomputedCoords.double_confirm.y, 20);
//                console.info("[坐标点击] 使用缓存坐标点击 确认无误");
                console.info("[点击] 确认无误1");
            } else if (purchase_type === '到店取') {
                clickByCoordinates('double_exactly');
//                press(precomputedCoords.double_exactly.x, precomputedCoords.double_exactly.y, 20);
//                console.info("[坐标点击] 使用缓存坐标点击 就是这家");
                console.info("[点击] 就是这家1");
            }
            sleep(ignore_ack_click_confirm_delay);

            // 添加超时机制，防止卡死
            var maxWaitTime = 2000; // 最大等待时间10秒
            var startTime = Date.now();

            if (paymentProcessAttemptCount >= paymentProcessMaxAttempts) {
                // 修改逻辑：当达到最大尝试次数时，直接启用坐标点击模式
                useCoordinateClickForConfirm = true;
                //console.warn("[支付线程] 达到最大尝试次数，启用坐标点击模式");
                // 重置计数器，避免无限循环
                paymentProcessAttemptCount = 0;
            }

            // 重置点击计数器，开始新的支付流程
            Clickedcount = 0;

            // 添加点击状态跟踪，确保顺序点击
            var confirmInfoClicked = false;
            var doubleConfirmClicked = false;
            var confirmInfoStartTime = Date.now();
            var enteredWhileLoop = false; // 标记是否进入了while循环
            var whileLoopStartTime = Date.now(); // 记录while循环开始时间

            while (className('android.widget.TextView').text('确认订单').exists() == true) {
                // 添加超时检查，防止while循环卡死
                if (Date.now() - whileLoopStartTime > maxWaitTime) {
                    //console.error("[支付线程] while循环超时，强制退出");
                    break;
                }

                enteredWhileLoop = true; // 标记已进入while循环
                paymentProcessAttemptCount = 0;
//                console.log('文本：查找\'确认信息并支付\'按钮',1);
                if(className('android.widget.TextView').text('确认信息并支付').exists()==true && !confirmInfoClicked){
                	safeClickByText(className('android.widget.TextView'),'确认信息并支付');
                    console.error("[点击] 确认信息并支付2");
                    confirmInfoClicked = true;
                    doubleConfirmClicked = false;
                    confirmInfoStartTime = Date.now(); // 记录点击时间
                    sleep(ignore_ack_click_delay + 50);
                }

//                console.log('文本：查找\'就是这家\'/\'确认无误\'按钮',1);
                if(confirmInfoClicked && !doubleConfirmClicked) {
                    // 检查是否失活：如果2秒内没有找到下一步按钮，启用备用方案
                    var currentTime = Date.now();
                    if((currentTime - confirmInfoStartTime) >= 1200) {
                        if(calibration_status.confirm_info) {
                            clickByCoordinates('confirm_info');
                            console.error("[点击] 确认信息并支付1");
                        }
                        // 重置状态，重新开始
                        confirmInfoClicked = true;
                        doubleConfirmClicked = false;
                        confirmInfoStartTime = Date.now();
                        sleep(ignore_ack_click_delay + 50);
                    } else {
                        // 正常流程：查找下一步按钮
                        last_double_confirm_time = new Date().getTime();
                        if(className('android.widget.TextView').text('就是这家').exists()==true) {
                        	safeClickByText(className('android.widget.TextView'),'就是这家');
                            console.info("[点击] 就是这家2");
                            doubleConfirmClicked = true;
                            confirmInfoClicked = false;
                            if(anti_rebound_mode){
                                Clickedcount++
                            };
                            //log(Clickedcount);
                            sleep(ignore_ack_click_confirm_delay);
                        } else if(className('android.widget.TextView').text('确认无误').exists()==true){
                        	safeClickByText(className('android.widget.TextView'),'确认无误');
                            console.info("[点击] 确认无误2");
                            doubleConfirmClicked = true;
                            confirmInfoClicked = false;
                            if(anti_rebound_mode){
                                Clickedcount++
                            };
                            sleep(ignore_ack_click_confirm_delay);
                        }

                    }
                }

                // 如果两个步骤都完成了，等待页面响应
                sleep(100); // 短暂等待，避免过度循环
            }

            // 5. 如果没有找到任何相关按钮，短暂等待后继续
            sleep(50);

            // === 检查是否进入while循环，决定是否启用坐标点击 ===
            if (!enteredWhileLoop) {
                //console.warn("[支付线程] 第" + paymentProcessAttemptCount + "次执行未进入确认订单页面循环");
                // 增加超时保护：如果总执行时间超过限制，强制启用坐标点击
                if (Date.now() - startTime > maxWaitTime) {
                    useCoordinateClickForConfirm = true;
                    //console.error("[支付线程] 总执行时间超时，强制启用坐标点击");
                    paymentProcessAttemptCount = 0;
                } else if (paymentProcessAttemptCount >= paymentProcessMaxAttempts) {
                    useCoordinateClickForConfirm = true;
                    //console.error("[支付线程] 连续" + paymentProcessMaxAttempts + "次未进入确认订单页面，启用坐标点击确定按钮");
                }
            } else {
                //console.info("[支付线程] 第" + paymentProcessAttemptCount + "次执行成功进入确认订单页面循环");
                // 重置计数器，因为成功进入了while循环
                paymentProcessAttemptCount = 0;
                useCoordinateClickForConfirm = false;
            }

            // 6. 检查是否已进入支付页面，设置submit_flag
            // 简化判定条件：离开确认订单页面且找不到webview_parent_node时设置支付标志
            if (!className('android.widget.TextView').text('确认订单').exists()) {
                // 检查是否找不到webview_parent_node（通常表示进入了支付页面）
                var webview_parent_node = get_webview_parent_node();
                if (!webview_parent_node) {
                    submit_flag = true;
                    console.info("[支付线程] 检测到已离开确认订单页面且无webview，设置支付标志");
                }
            }
    }

    isPaymentProcessing = false;
    shouldMainThreadPause = false;
    //console.info('[线程协调] 支付线程处理完成，主线程恢复正常');

    //console.log('=== 支付流程结束 ===');

    // 检查是否进入微信支付页面 - 支付线程完成后触发
    if (submit_flag) {
        console.error("[页面检测] 当前处于支付页面");
        console.warn("[通知] 中单!中单！ 请及时支付以免错过!");
        if (vibrate_time > 0) {
            device.vibrate(vibrate_time);
        }

        // 判断是否需要输入密码
        if (password_or_vibrate === "震动(不设置密码)") {
            console.info("[密码设置] 选择了震动模式，不自动输入密码");
        } else {
            console.info("[密码输入] 开始等待微信支付密码键盘...");
            waitAndInputPassword(password_setting.toString());
        }
        submit_flag = false;
        if (script_pause_when_success_conf) {
            script_status = 0;
            // 使用ui.post确保UI操作在UI线程中执行
            ui.post(() => {
                stop();
            });
        }
    }
}

while (true) {
    // 定时器检查 - 如果设置了自动结束时间且已超时，则退出脚本
    if (script_auto_exit_time > 0 && script_start_time > 0) {
        var current_time = new Date().getTime();
        var elapsed_minutes = (current_time - script_start_time) / (1000 * 60);
        var remaining_minutes = script_auto_exit_time - elapsed_minutes;

        // 每5分钟显示一次剩余时间，避免重复显示
        var current_minute = Math.floor(elapsed_minutes);
        if (current_minute % 5 === 0 && current_minute > 0 && current_minute <= script_auto_exit_time && current_minute !== last_timer_display_minute) {
            //console.info("[定时器] 脚本已运行 " + current_minute + " 分钟，剩余 " + Math.floor(remaining_minutes) + " 分钟");
            last_timer_display_minute = current_minute;
        }

        if (elapsed_minutes >= script_auto_exit_time) {
           // console.warn("[定时器] 脚本运行时间已达到 " + script_auto_exit_time + " 分钟，自动退出");
            // 使用ui.post确保UI操作在UI线程中执行
            ui.post(() => {
                stop();
            });
            // 等待UI更新完成后退出
            sleep(1000);
            exit();
        }
    }

    if (script_status == 0) {

        // Reset ALL state variables to ensure clean restart
        rebuy_flag = false;
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        dc_streak = 0;
        last_double_confirm_time = 0;
        last_confirm_time = 0;
        confirm_btn_retry_count = 0;
        payment_page_confirm_btn_retry_count = 0;
        tried_clicked_confirm_to_pay_page_count = 0;
        submited_refresh_flag = false;
        submited_refresh_count = 0;

        // 新增：支付线程清理 (参考 JS_hongzhong.js)
        paymentStartFlag = false;
        isRunning = false;
        if (paymentThread && paymentThread.isAlive()) {
            paymentThread.interrupt();
            paymentThread = null;
        }

        // === 重置线程协调状态 ===
        isPaymentProcessing = false;
        shouldMainThreadPause = false;
        paymentCompleted = false;
        lastPaymentPageDetectTime = 0;
        paymentProcessStartTime = 0;

//        console.info('[线程协调] 所有线程状态已重置');

        sleep(10); // 使用快速模式停止延迟
        continue;
    }
    // log("===start===")
    sleep(100); // 使用快速模式主循环延迟
    // console.time("get_webview_parent_node");
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        if (debug_mode_conf) {
            log("Cannot find webview parent node.");
        }
        // 支付页面检测和密码输入逻辑 - 不受支付线程影响
        var had_submit_flag = false;
        if (submit_flag) {
            had_submit_flag = true;
            submit_flag = false;
            console.error("[页面检测] 当前处于支付页面");
            console.warn("[通知] 中单!中单！ 请及时支付以免错过!");
            if (vibrate_time > 0) {
                device.vibrate(vibrate_time);
            }
            // 判断是否需要输入密码
            if (password_or_vibrate === "震动(不设置密码)") {
                console.info("[密码设置] 选择了震动模式，不自动输入密码");
            } else {
                console.info("[密码输入] 开始等待微信支付密码键盘...");
                waitAndInputPassword(password_setting.toString());
            }
        }
        // 当检测不到webview时，不要停止脚本，继续尝试检测
        // 只有在成功处理了支付页面后才考虑停止
        if (had_submit_flag && script_pause_when_success_conf) {
           script_status = 0;
           // 使用ui.post确保UI操作在UI线程中执行
           ui.post(() => {
               stop();
           });
        } else {
           continue;
        }
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
        // ===== 双线程协调架构 (主线程 + 支付线程) =====

        // 1. 检查是否应该让位给支付线程
        if (shouldMainThreadPause && isPaymentProcessing) {
            // 支付线程正在处理，主线程暂停处理此页面
            if (debug_mode_conf) {
                var processingTime = Math.round((Date.now() - paymentProcessStartTime) / 1000);
               // console.log("[线程协调] 支付线程处理中(" + processingTime + "s)，主线程暂停");
            }
            sleep(500); // 较长等待时间，给支付线程更多处理时间
            break;
        }

        // 2. 检查支付是否已完成
        if (paymentCompleted) {
            //console.log("[线程协调] 支付已完成，主线程恢复正常监控");
            paymentCompleted = false; // 重置标志
            sleep(100);
            break;
        }

        // 3. 检查支付线程状态并启动新的支付线程（如果需要）
        // 先清理旧线程，确保只有一个支付线程运行
        if (paymentThread && paymentThread.isAlive()) {
            paymentThread.interrupt();
           // console.info("[线程管理] 主线程中断旧支付线程");
        }

        // 重置状态
        isRunning = true;
        paymentStartFlag = true;
        lastPaymentPageDetectTime = Date.now();

        // 启动支付线程
        paymentThread = threads.start(startPaymentProcess);
       // console.info("[线程协调] 支付线程已启动，主线程将暂停对此页面的处理");

        // 4. 适当的等待时间，避免过度检测
        sleep(200);
        break;

        case "info_page":
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        if (!rebuy_flag) {
            sleep(100);
            var confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
            if (!confirm_btn) {
                // 检查是否有"立即购买"按钮
                var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    buyNowBtn.click();
                    console.info("点击立即购买按钮");
                    sleep(400);
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
                var confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
                if (!confirm_btn) {
                    rebuy_flag = false;
                }
                sleep(150);
            }
        }

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
        // var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
        // if (!confirm_btn) {
        //         // 检查是否有"立即购买"按钮
        // var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
        // if (buyNowBtn) {
        //     buyNowBtn.click();
        //     console.info("点击立即购买按钮");
        // };
        submit_flag = false;
        dc_streak = 0;

        // 检查是否已经执行过确认按钮逻辑，如果是则跳过选择操作

        if (!rebuy_flag && !confirmButtonExecuted) {
            // 优化的并行识别和点击逻辑
            //console.info("[并行选择] 开始同时识别购买方式和规格...");
            // 并行查找购买方式和规格的相关元素
            var purchase_type_btn = null;
            var specs_btn = null;
            var purchase_found_method = "";
            var specs_found_method = "";

            // 快速扫描页面中的所有相关元素
            //console.info("[并行选择] 开始快速扫描页面元素...");
            var allElements = current_webview.find(className("android.view.View").algorithm('DFS'));
            var purchase_elements = [];
            var specs_elements = [];

            // 方法1: 直接使用选择器查找，而不是遍历View元素
//                console.info("=== 尝试直接选择器查找方法 ===");

            // 查找所有TextView元素
            var textViews = current_webview.find(className("android.widget.TextView").algorithm('DFS'));
//                console.info("找到TextView数量: " + textViews.length);

            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];
                try {
                    var elementText = element.text();
                    if (elementText) {
                        // 检查购买方式元素
                        if (elementText.includes(purchase_type) || elementText.includes("送到家") || elementText.includes("到店取")) {
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
            var buttons = current_webview.find(className("android.widget.Button").algorithm('DFS'));
            //console.info("找到Button数量: " + buttons.length);

            for (var i = 0; i < buttons.length; i++) {
                try {
                    var btn = buttons[i];
                    var btnText = btn.text();
                    console.info("Button[" + (i+1) + "] 文本: '" + (btnText || "") + "'");

                    if (btnText) {
                        // 检查购买方式
                        if (btnText.includes(purchase_type) || btnText.includes("送到家") || btnText.includes("到店取")) {
                            purchase_elements.push({
                                text: btnText,
                                element: btn,
                                clickable: btn.clickable()
                            });
                        }
                        // 检查规格
                        if (btnText.includes("单个") || btnText.includes("整盒") || btnText.includes("整端") || btnText.includes("盲盒")) {
                            specs_elements.push({
                                text: btnText,
                                element: btn,
                                clickable: btn.clickable()
                            });
                        }
                    }
                } catch (e) {
                    // 忽略错误
            }



            var selectElements = []; // 存储"选择**"元素信息
            var buyMethodIndex = -1; // "购买方式"的索引
            var selectSpecIndex = -1; // "选择规格"的索引
            var selectOptionsToClick = []; // 存储需要点击的选择项

            // 1. 找到所有"选择**"元素和关键元素的位置
            for (var i = 0; i < textViews.length; i++) {
                try {
                    var tv = textViews[i];
                    var tvText = tv.text();

                    if (tvText) {
                        // 匹配"选择**"模式
                        if (tvText.startsWith("选择")) {
                            selectElements.push({
                                    index: i,
                                    text: tvText,
                                    element: tv
                            });
                            //    console.info("找到选择元素[" + i + "]: " + tvText);
                        }

                        // 找到"购买方式"
                        if (tvText === "购买方式") {
                            buyMethodIndex = i;
                            //    console.info("找到购买方式[" + i + "]: " + tvText);
                        }

                        // 找到"选择规格"
                        if (tvText === "选择规格") {
                            selectSpecIndex = i;
                            //   console.info("找到选择规格[" + i + "]: " + tvText);
                        }
                    }
                } catch (e) {
                    // 忽略错误
                }
            }

            // 2. 为每个"选择**"元素创建spec_select数组
            for (var i = 0; i < selectElements.length; i++) {
                var selectElement = selectElements[i];
                var selectIndex = selectElement.index;
                var currentSelectNumber = i + 1; // 当前是第几个"选择**"区域
//                    console.info("分析第" + currentSelectNumber + "个选择元素: " + selectElement.text + " (索引:" + selectIndex + ")");

                //找到在当前"选择**"下面且最靠近的"购买方式"或"选择规格"
                var nearestEndIndex = -1;
                var endElementText = "";

                // 检查"购买方式"是否在下面且更近
                if (buyMethodIndex > selectIndex) {
                    nearestEndIndex = buyMethodIndex;
                    endElementText = "购买方式";
                }

                // 检查"选择规格"是否在下面且更近
                if (selectSpecIndex > selectIndex) {
                    if (nearestEndIndex === -1 || selectSpecIndex < nearestEndIndex) {
                        nearestEndIndex = selectSpecIndex;
                        endElementText = "选择规格";
                    }
                }

                if (nearestEndIndex !== -1) {
//                       console.info("找到最近的结束元素: " + endElementText + " (索引:" + nearestEndIndex + ")");

                    // 创建spec_select数组，只包含中间的选项元素（排除开始和结束元素）
                    var spec_select = [];
                    for (var j = selectIndex + 1; j < nearestEndIndex; j++) {
                        try {
                            var element = textViews[j];
                            var elementText = element.text();
                            if (elementText && elementText.trim().length > 0) {
                                spec_select.push({
                                    index: j,
                                    text: elementText,
                                    element: element,
                                    arrayIndex: spec_select.length + 1 // 从1开始的数组索引
                                });
                            }
                        } catch (e) {
                            // 忽略错误
                        }
                    }

//                        console.info("=== 第" + currentSelectNumber + "个选择区域: " + selectElement.text + " 的选项元素 ===");
                    for (var k = 0; k < spec_select.length; k++) {
//                            console.info("  选项[" + spec_select[k].arrayIndex + "] " + spec_select[k].text + " (TextView索引:" + spec_select[k].index + ")");
                    }
//                        console.info("=== 共 " + spec_select.length + " 个选项 ===");

                    // 记录需要点击的选择项，不立即点击
                    if (select_index > 0 && select_index <= spec_select.length) {
                        var targetOption = spec_select[select_index - 1]; // 数组从0开始，但配置从1开始
                        selectOptionsToClick.push({
                                selectArea: selectElement.text,
                                selectAreaNumber: currentSelectNumber,
                                optionText: targetOption.text,
                                element: targetOption.element,
                                optionIndex: select_index
                        });
//                            console.info("📋 记录待点击: 第" + currentSelectNumber + "个选择区域(" + selectElement.text + ")中的第" + select_index + "个选项 - " + targetOption.text);
                    } else if (select_index > 0) {
//                            console.warn("配置的选项索引 " + select_index + " 超出范围，第" + currentSelectNumber + "个选择区域(" + selectElement.text + ")只有 " + spec_select.length + " 个选项");
                    }

                } else {
//                        console.info("未找到在第" + currentSelectNumber + "个选择区域(" + selectElement.text + ")下面的购买方式或选择规格");
                }
            }

            //console.info("[并行选择] 扫描完成 - 购买方式元素: " + purchase_elements.length + " 个, 规格元素: " + specs_elements.length + " 个");

            // 并行处理购买方式选择
            if (refresh_mode == "智能刷" || refresh_mode == "切换刷" || refresh_mode == "页面刷") {
                console.info("[并行选择] 处理购买方式: " + purchase_type);

                // 方法1: 从扫描结果中快速匹配
                for (var i = 0; i < purchase_elements.length; i++) {
                    var element = purchase_elements[i];
                    if (element.text.includes(purchase_type)) {
                        purchase_type_btn = element.element;
                        purchase_found_method = "扫描匹配";
                        //console.info("[并行选择] 购买方式扫描匹配成功: " + element.text);
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
            //console.info("[并行选择] 处理规格: " + specs);

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
                    //console.info("[并行选择] 规格扫描匹配成功: " + element.text);
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
            //console.info("[并行选择] 开始执行点击操作...");

            // 点击选择项
//                console.info("需要点击的选择项数量: " + selectOptionsToClick.length);
            for (var i = 0; i < selectOptionsToClick.length; i++) {
                var selectOption = selectOptionsToClick[i];
                //console.info("[并行选择] 点击选择项: 第" + selectOption.selectAreaNumber + "个选择区域(" + selectOption.selectArea + ")中的第" + selectOption.optionIndex + "个选项 - " + selectOption.optionText);
                try {
                    selectOption.element.click();
//                        console.info("[并行选择] 选择项点击成功: " + selectOption.optionText);
                } catch (e) {
                    console.error("[并行选择] 选择项点击失败: " + selectOption.optionText + ", 错误: " + e.message);
                    try {
                        var bounds = selectOption.element.bounds();
                        click(bounds.centerX(), bounds.centerY());
                        console.info("[并行选择] 选择项坐标点击成功: " + selectOption.optionText);
                    } catch (e2) {
//                            console.error("[并行选择] 选择项坐标点击也失败: " + selectOption.optionText + ", 错误: " + e2.message);
                    }
                }
            }
            // 点击购买方式
            if (purchase_type_btn) {
                //console.info("[并行选择] 点击购买方式，匹配方式: " + purchase_found_method);
                try {
                    purchase_type_btn.click();
                    //console.info("[并行选择] 购买方式点击成功");
                    purchase_type_btne_click = true;
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
            } else if (purchase_type != "切换刷") {
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
        }
            var refreshTimeStart = new Date();
            var current_selection = purchase_type;
            if (current_selection == '到店取') {
                current_selection = '送到家';
            } else {
                current_selection = '到店取';
            }

            // 立即开始查找确定按钮，零延迟
            var confirm_btn = className('android.widget.TextView').text('确定').findOne(20);

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
                            console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟", "，脚本已停止");
                        } else {
                            console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟", "，已设定睡眠时间:"+timeout_sleep_wait_time+"秒，脚本已暂停");
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
                    confirmButtonExecuted = false; // 重置确认按钮执行标志
                    break;
                }
                var should_skip_delay = false;
                var check_start_time = new Date().getTime();
                var purchase_btn = current_webview.findOne(text("立即购买").algorithm('DFS'));

                // refresh logic
                if (purchase_btn) {
                    confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
                    if (confirm_btn) {
                        break;
                    }
                    // safe stock check logic
                    if (!should_skip_delay && refresh_mode == "切换刷" && current_selection != purchase_type && !purchase_type_btne_click) {
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
                            confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
                            if (confirm_btn) {
                                break;
                            }
                            if (script_status == 0) {
                                rebuy_flag = false;
                                submit_flag = false;
                                dc_streak = 0;
                                confirmButtonExecuted = false; // 重置确认按钮执行标志
                                break;
                            }
                        }
                        if (sold_out) {
                            console.warn("已售罄");
                        } else if (confirm_btn) {
                            console.warn("有库存");
                        }
                    }
                        if (refresh_mode == "智能刷") {
                            if (!rebuy_flag) {
                                purchase_btn.click();
                            }
                        } else if(refresh_mode == "切换刷"){
                            var current_selection_btn = current_webview.findOne(text(current_selection).algorithm('DFS'));
                            if (current_selection_btn && !purchase_type_btne_click) {
                                current_selection_btn.click();
                                log("[点击]" + current_selection);
                                if (current_selection_btn && current_selection != purchase_type) {
                                    should_skip_delay = true;
                                    //console.info("[切换刷] 当前选择(" + current_selection + ")与目标类型(" + purchase_type + ")不同，跳过刷新延迟");
                                }
                                if (current_selection == '到店取') {
                                    current_selection = '送到家';
                                } else {
                                    current_selection = '到店取';
                                }
                                if(current_selection == purchase_type){
                                    sleep(240);
                                }

                            }
                        }else if(refresh_mode == "页面刷"){
                            pageCloseRefresh();
                            break;
                    }

                }
                if (!should_skip_delay) {
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
                if(!should_skip_delay && refresh_mode == "切换刷"){
                    sleep(sleepTarget + 400);
                    console.info("[注意] 库存刷新耗时: ", sleepTarget + 450, "ms");
                }else{
                    sleep(sleepTarget);
                    console.info("[注意] 库存刷新耗时: ", sleepTarget + 50, "ms");
                }


                // 在等待前先快速检查一次确定按钮
                confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (confirm_btn) break;


                purchase_count_label = current_webview.findOne(text("数量").algorithm('DFS'));
                if (!purchase_count_label) {
                    break;
                }


                if (confirm_btn) {
                    break;
                }
                if (sku_result_toast_conf) {
                    click_plus_btn(current_webview);
                }
                purchase_type_btne_click = false;
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
        if (className('android.widget.TextView').text('确定').exists() == true) {
        confirm_btn = className('android.widget.TextView').text('确定').findOne();
        // add retry count if not confirm_btn found for like 10 times, then disable the rebuy_flag
        if (confirm_btn) {
            confirm_btn_retry_count = 0;
            if (ignore_ack_conf) {
                // var now = new Date().getTime();
                // var elapsed = now - last_double_confirm_time;
                if (Clickedcount <= 0) {

                    if (useCoordinateClickForConfirm) {
                        clickConfirmButtonByCoordinates(confirm_btn);
                        console.info("[操作] 点击确定按钮1.1");
                        sleep(150);
                    } else {
                        confirm_btn.click();
                        console.info("[操作] 点击确定按钮1");
                    }
                    sleep(special_confirm_delay + 50);

                    // 重置点击计数器
                    Clickedcount = 0;

                    // 先清理旧线程，确保只有一个支付线程运行
                    if (paymentThread && paymentThread.isAlive()) {
                        paymentThread.interrupt();
                        //console.info("[线程管理] 中断旧支付线程");
                    }

                    isRunning = true;
                    paymentStartFlag = true;
                    paymentThread = threads.start(startPaymentProcess);
                    //console.info("=== 支付线程已启动 ===");

                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                } else {
                    console.warn("[等待] 为防止反复被打回，等待", 550, "ms后点击确定");
                    sleep(550);
                    if (useCoordinateClickForConfirm) {
                        clickConfirmButtonByCoordinates(confirm_btn);
                        console.info("[操作] 点击确定按钮2.1");
                        sleep(150);
                    } else {
                        confirm_btn.click();
                        console.info("[操作] 点击确定按钮2");
                    }
                    sleep(special_confirm_delay + 50);

                    // 重置点击计数器
                    Clickedcount = 0;
                    // === 同样启动支付线程 ===
                    // 先清理旧线程，确保只有一个支付线程运行
                    if (paymentThread && paymentThread.isAlive()) {
                        paymentThread.interrupt();
                        //console.info("[线程管理] 中断旧支付线程");
                    }

                    isRunning = true;
                    paymentStartFlag = true;
                    paymentThread = threads.start(startPaymentProcess);
                    //console.info("=== 支付线程已启动 (延迟模式) ===");

                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                }
            } else {
                var now = new Date().getTime();
                var elapsed = now - last_confirm_time;
                if (elapsed >= 450) {
                    last_confirm_time = now;
                    if (useCoordinateClickForConfirm) {
                        clickConfirmButtonByCoordinates(confirm_btn);
                        console.info("[操作] 点击确定按钮3.1");
                        sleep(150);
                    } else {
                        confirm_btn.click();
                        console.info("[操作] 点击确定按钮3");
                    }
                    sleep(special_confirm_delay + 50);

                    // 重置点击计数器
                    Clickedcount = 0;
                    // === 支付线程启动 ===
                    // 先清理旧线程，确保只有一个支付线程运行
                    if (paymentThread && paymentThread.isAlive()) {
                        paymentThread.interrupt();
                        //console.info("[线程管理] 中断旧支付线程");
                    }

                    isRunning = true;
                    paymentStartFlag = true;
                    paymentThread = threads.start(startPaymentProcess);
                    //console.log("=== 支付线程已启动 (备用模式) ===");

                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                }
                rebuy_flag = true;
                ignore_next_purchase_page_flag = true;
            }
            // 确认按钮逻辑执行完毕，设置标志防止重复执行选择操作
            confirmButtonExecuted = true;
            //console.info("[状态设置] 确认按钮逻辑执行完毕，设置标志防止重复执行选择操作");
            sleep(50 + extra_delay);
        } else {
            confirm_btn_retry_count++;
            if (confirm_btn_retry_count >= 10) {
                confirm_btn_retry_count = 0;
                rebuy_flag = false;
                submit_flag = false;
                dc_streak = 0;
                ignore_next_purchase_page_flag = false;
                confirmButtonExecuted = false; // 重置确认按钮执行标志
                break;
            }
        }
        }
        break;
        case "purchase_ready":
        if (className('android.widget.TextView').text('确定').exists() == true) {
        var confirm_btn = className('android.widget.TextView').text('确定').findOne();
        if (confirm_btn) {
            if (useCoordinateClickForConfirm) {
                clickConfirmButtonByCoordinates(confirm_btn);
                console.info("[操作] 点击确定按钮1.31");
                sleep(150);
            } else {
                confirm_btn.click();
                console.info("[操作] 点击确定按钮1.3");
            }
        }
        }

        break;
        case "back":
            back();
            sleep(100);
            if (className('android.widget.TextView').text('确定').exists() == true) {
                var confirmBtn = className('android.widget.TextView').text('确定').findOne();
                if (confirmBtn) {
                    if (useCoordinateClickForConfirm) {
                        clickConfirmButtonByCoordinates(confirmBtn);
                        console.warn("[操作] 点击确定按钮1.21");
                        sleep(150);
                    } else {
                        confirmBtn.click();
                        console.warn("[操作] 点击确定按钮1.2");
                    }
                    sleep(special_confirm_delay + 50);; // 等待点击响应
                }

                //console.info("找到 确认 按钮");
                if (paymentThread && paymentThread.isAlive()) {
                    //console.info("payment thread is alive");
                    paymentThread.interrupt();
                    //console.info("[线程管理] 中断旧支付线程");
                }
                rebuy_flag = true;
                isRunning = true;
                paymentStartFlag = true;
                paymentThread = threads.start(startPaymentProcess);
            }
            break;
        case "default":
        // Default logic
        if (className('android.widget.TextView').text('确定').exists() == true) {
            //console.info("找到 确认 按钮");

            // 点击确认按钮
            var confirmBtn = className('android.widget.TextView').text('确定').findOne();
            if (confirmBtn) {
                if (useCoordinateClickForConfirm) {
                    clickConfirmButtonByCoordinates(confirmBtn);
                    console.warn("[操作] 点击确定按钮1.31");
                    sleep(150);
                } else {
                    confirmBtn.click();
                    console.warn("[操作] 点击确定按钮1.3");
                }
                sleep(special_confirm_delay + 50);; // 等待点击响应
            }

            if (paymentThread && paymentThread.isAlive()) {
                //console.info("payment thread is alive");
                paymentThread.interrupt();
                //console.info("[线程管理] 中断旧支付线程");
            }

            rebuy_flag = true;
            isRunning = true;
            paymentStartFlag = true;
            paymentThread = threads.start(startPaymentProcess);
        }
        break;
        case "no_webview":
        log("No current webview found");
        break;
        default:
        log("Unknown status: ");
        break;
    }
    // 在页面状态切换时重置hasClickedConfirmAndPay
}



