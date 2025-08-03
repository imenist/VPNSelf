// 文档地址：https://docs.hamibot.com/

auto.waitFor()
auto.setMode('fast')
// auto.setFlags(['findOnUiThread']);
console.error("[无障碍] 状态正常");

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
    click_new_notification_conf,
    hide_console_conf,
    disable_click,
    ack_delay_conf,
    debug_mode_conf,
    ignore_ack_conf,
    main_window_alpha_conf,
    reset_floaty_position_conf,
    ignore_ack_click_delay_conf,
    sku_result_toast_conf,
    rage_stock_refresh_conf,
    vibrate_time_conf,
    special_confirm_delay_conf,
    use_legacy_floaty_conf,
    use_minimal_floaty_conf,
    special_click_confirm_conf,
    extra_selection_regex_conf
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
var refresh_delay = parseInt(delay_conf) || 300;
var extra_delay = parseInt(extra_delay_conf) || 0;
var max_refresh_time = parseFloat(max_refresh_time_conf) || 0;
var ack_delay = parseInt(ack_delay_conf) || 0;
var auto_click_notification = auto_click_notification_conf || false;
var random_refresh_delay_lower = Math.max(parseInt(random_delay_lower_conf) || 10, 1);
var random_refresh_delay_upper = Math.max(parseInt(random_delay_upper_conf) || 150, 1);
var main_window_alpha = Math.min(Math.max(parseFloat(main_window_alpha_conf) || 0.9, 0.0), 1.0);
var ignore_ack_click_delay = parseInt(ignore_ack_click_delay_conf) || 200;
var last_double_confirm_time = 0;
var last_purchase_now_time = 0;
var last_refresh_timeout_time = 0;
var refresh_timeout_count = 0;
var last_confirm_time = Date.now();
var vibrate_time = parseInt(vibrate_time_conf) || 3000;
var special_confirm_delay = parseInt(special_confirm_delay_conf) || 1750;
var reset_floaty_position = reset_floaty_position_conf || false;
var enable_random_delay = enable_random_delay_conf || false;
var ignore_ack = ignore_ack_conf || false;
var use_legacy_floaty = use_legacy_floaty_conf || false;
var use_minimal_floaty = use_minimal_floaty_conf || false;
var click_new_notification = click_new_notification_conf || false;
var rage_stock_refresh = rage_stock_refresh_conf || false;
var special_click_confirm = special_click_confirm_conf || false;
var extra_selection_regex = extra_selection_regex_conf || "";

var has_shown_first_time_warning = false;

console.info('[欢迎使用] Dr. PopMart 抢购脚本');
console.warn('目前的购买方案为: ', purchase_type);
console.warn('目前的抢购数量为: ', purchase_count);
console.warn('目前的抢购规格为: ', specs);
if (onFreeTrial) {
    console.error('目前为免费试用版, 功能受到限制，如果觉得好用请重新订阅后再次购买!');
    console.error('在试用期间, 刷新速度的配置选项将无效, 固定为2000ms(2秒)');
    refresh_delay = 2000;
} else {
    console.error('您目前使用的是本脚本的付费版, 功能将不会受到限制!');
    console.error('非常感谢您的支持! 目前脚本将全速运行!');
    console.error("有任何问题或功能建议，欢迎您发工单");
}

if (use_legacy_floaty) {
    var storage = storages.create('DRP');
    var w = floaty.window(
        <vertical id="main_window" bg="#000000" alpha="0.9" w="100">
            <text id="title" text="Dr. PopMart" gravity="center" textColor="#66ccff" textStyle="bold" />
            <horizontal>
                <button id="start" text="运行" bg="#00FFFF" w="100" visibility="visible" />
                <button id="end" text="停止" bg="#FF0000" w="100" visibility="gone" />

            </horizontal>
            <button text="" bg="#111111" w="50" h="10" />
            <horizontal>
                <button id="type_settings" text="方式" bg="#66ccff" w="50" h="40" />
                <button id="number_settings" text="数量" bg="#f0ff0f" w="50" h="40" />
            </horizontal>
            <button text="" bg="#111111" w="50" h="10" />
            <horizontal>
                <button id="move_start" text="移动" bg="#f0ff0f" w="100" h="40" visibility="visible" />
                <button id="move_end" text="固定" bg="#00FFFF" w="100" h="40" visibility="gone" />
            </horizontal>
        </vertical>
    );

    w.main_window.attr('alpha', main_window_alpha);

    function start() {
        script_status = 1;
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
        if (!has_shown_first_time_warning) {
            console.log("[提示] 如果脚本没反应，请重启hamibot和微信");
            has_shown_first_time_warning = true;
        }
    });

    w.end.click(function () {
        stop();
        console.error("[状态] 抢购脚本停止");
    });

    w.move_start.click(function () {
        w.setAdjustEnabled(true)
        w.move_start.attr('visibility', 'gone');
        w.move_end.attr('visibility', 'visible');
    });

    w.move_end.click(function () {
        w.setAdjustEnabled(false)
        w.move_start.attr('visibility', 'visible');
        w.move_end.attr('visibility', 'gone');
        // Save position to storage and warn
        var x = w.getX();
        var y = w.getY();
        storage.put('floaty_position_x', x);
        storage.put('floaty_position_y', y);
        console.warn("[提示] 悬浮窗位置已记录");
    });

    w.type_settings.click(function () {
        'ui';
        const deliveryOptions = ['送到家', '到店取', '来回刷'];

        var deliveryTypeIdx = deliveryOptions.indexOf(purchase_type);

        dialogs
            .singleChoice('请选择配送方案', deliveryOptions, deliveryTypeIdx)
            .then((i) => {
                switch (i) {
                    case 0:
                        purchase_type = '送到家';
                        break;
                    case 1:
                        purchase_type = '到店取';
                        break;
                    case 2:
                        purchase_type = '来回刷';
                        break;
                }
                console.info('目前的购买方案为: ', purchase_type);
                console.info('如果已在运行状态，请停止后重新运行');
            });

    });

    w.number_settings.click(function () {
        'ui';
        dialogs.rawInput('请输入购买数量', purchase_count).then((new_purchase_count) => {
            // error while
            if (parseInt(new_purchase_count) > 0) {
                purchase_count = parseInt(new_purchase_count);
                console.info('目前的购买数量为: ', purchase_count);
                console.info('如果已在运行状态，请停止后重新运行');
            } else {
                console.info('请输入正整数, [', new_purchase_count, ']不符合规范');
            }

        });

    });

    var posX = storage.get('floaty_position_x');
    var posY = storage.get('floaty_position_y');
    var defaultX = device.width / 2 + 100;
    var defaultY = w.getY() + 100;
    if (typeof posX === 'number' && typeof posY === 'number' && posX >= 0 && posX + 100 <= device.width) {
        console.warn("[提示] 悬浮窗位置已读取");
        w.setPosition(posX, posY);
    } else {
        w.setPosition(defaultX, defaultY);
    }
} else {
    var storage = storages.create('DRP');
    if (use_minimal_floaty) {
        var w = floaty.rawWindow(
            <frame>
                <img id="drag" src="@drawable/ic_launcher" circle="true" tint="#66ccff" bg="#00000000" padding="2" w="75" h="75" />
                <text id="text_status" text="启动" textColor="#FFFFFF" textSize="14sp" layout_gravity="center" gravity="center" bg="#00000000" />
            </frame>
        );

        w.setTouchable(true);

        var script_status = 0;

        let x, y, windowX, windowY;
        let downTime = 0;
        const CLICK_THRESHOLD = 200;
        const LONG_PRESS_THRESHOLD = 600;
        const MOVE_TOLERANCE = 10;
        let longPressTimeout;
        let longPressed = false;

        w.drag.setOnTouchListener(function (view, event) {
            switch (event.getAction()) {
                case event.ACTION_DOWN:
                    x = event.getRawX();
                    y = event.getRawY();
                    windowX = w.getX();
                    windowY = w.getY();
                    downTime = new Date().getTime();

                    longPressTimeout = setTimeout(() => {
                        longPressed = true;
                        toggle_config();
                    }, LONG_PRESS_THRESHOLD);
                    return true;

                case event.ACTION_MOVE:
                    let dx = event.getRawX() - x;
                    let dy = event.getRawY() - y;
                    w.setPosition(windowX + dx, windowY + dy);
                    if (Math.abs(dx) > MOVE_TOLERANCE || Math.abs(dy) > MOVE_TOLERANCE) {
                        clearTimeout(longPressTimeout);
                        longPressed = false;
                    }
                    return true;

                case event.ACTION_UP:
                    let upTime = new Date().getTime();
                    if (upTime - downTime < CLICK_THRESHOLD) {
                        switch_script_status();
                        longPressed = false;
                        clearTimeout(longPressTimeout);
                    }

                    return true;
            }
            return false;
        });

        function toggle_config() {
            try {
                if (!configWindow) {
                    configWindow = createConfigWindow();

                    var windowWidth = String(device.width * 0.8) + "px";
                    var windowHeight = String(device.height * 0.8) + "px";

                    configWindow.config_main.attr('w', windowWidth);
                    configWindow.config_main.attr('h', windowHeight);
                    sleep(500);
                }

                toggleConfigWindow();
            } catch (e) {
                log("Error in config button click: " + e);
            }
        }
        function switch_script_status() {
            if (script_status == 1) {
                console.error("[状态] 抢购脚本停止");
                w.text_status.setText('启动');
                try {
                    w.drag.attr('tint', '#66ccff'); // Material Design green
                } catch (e) {
                    console.error("Failed to set image tint:", e);
                }
                script_status = 0;
            } else {
                console.error("[状态] 抢购脚本启动");
                if (!has_shown_first_time_warning) {
                    console.log("[提示] 如果脚本没反应，请重启hamibot和微信");
                    has_shown_first_time_warning = true;
                }
                w.text_status.setText('停止');
                try {
                    w.drag.attr('tint', '#FF4444'); // Softer red color
                } catch (e) {
                    console.error("Failed to set image tint:", e);
                }
                script_status = 1;
            }
        }

    } else {
        var w = floaty.window(
            <vertical id="main_window" bg="#000000" alpha="0.9" w="100">
                <text id="title" text="Dr. PopMart" gravity="center" textColor="#66ccff" textStyle="bold" />
                <horizontal>
                    <button id="start" text="运行" bg="#00FFFF" w="100" visibility="visible" />
                    <button id="end" text="停止" bg="#FF0000" w="100" visibility="gone" />

                </horizontal >
                <button text="" bg="#111111" w="50" h="3" />
                <horizontal>
                    <button id="config_settings" text="配置" bg="#66ccff" w="100" h="40" />
                </horizontal>
                <button text="" bg="#111111" w="50" h="3" />
                <horizontal>
                    <button id="move_start" text="移动" bg="#f0ff0f" w="100" h="40" visibility="visible" />
                    <button id="move_end" text="固定" bg="#00FFFF" w="100" h="40" visibility="gone" />
                </horizontal>
            </vertical>
        );

        w.main_window.attr('alpha', main_window_alpha);

        function start() {
            script_status = 1;
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
            if (!has_shown_first_time_warning) {
                console.log("[提示] 如果脚本没反应，请重启hamibot和微信");
                has_shown_first_time_warning = true;
            }
        });

        w.end.click(function () {
            stop();
            console.error("[状态] 抢购脚本停止");
        });

        w.move_start.click(function () {
            w.setAdjustEnabled(true)
            w.move_start.attr('visibility', 'gone');
            w.move_end.attr('visibility', 'visible');
        });

        w.move_end.click(function () {
            w.setAdjustEnabled(false)
            w.move_start.attr('visibility', 'visible');
            w.move_end.attr('visibility', 'gone');
            // Save position to storage and warn
            var x = w.getX();
            var y = w.getY();
            storage.put('floaty_position_x', x);
            storage.put('floaty_position_y', y);
            console.warn("[提示] 悬浮窗位置已记录");
        });
    }






    // Configuration window - create once and show/hide
    var configWindow = null;
    var isConfigWindowVisible = false;

    // Preset management functions
    function getCurrentConfig() {
        return {
            purchase_type: purchase_type,
            purchase_count: purchase_count,
            specs: specs,
            refresh_delay: refresh_delay,
            enable_random_delay: enable_random_delay,
            extra_delay: extra_delay,
            ack_delay: ack_delay,
            ignore_ack: ignore_ack,
            special_confirm_delay: special_confirm_delay,
            ignore_ack_click_delay: ignore_ack_click_delay,
            random_refresh_delay_lower: random_refresh_delay_lower,
            random_refresh_delay_upper: random_refresh_delay_upper,
            max_refresh_time: max_refresh_time,
            rage_stock_refresh: rage_stock_refresh,
            vibrate_time: vibrate_time,
            main_window_alpha: main_window_alpha,
            auto_click_notification: auto_click_notification,
            reset_floaty_position: reset_floaty_position,
            extra_selection_regex: extra_selection_regex
        };
    }

    function loadConfig(config) {
        purchase_type = config.purchase_type;
        purchase_count = config.purchase_count;
        specs = config.specs;
        refresh_delay = config.refresh_delay;
        enable_random_delay = config.enable_random_delay;
        extra_delay = config.extra_delay;
        ack_delay = config.ack_delay;
        ignore_ack = config.ignore_ack;
        special_confirm_delay = config.special_confirm_delay;
        ignore_ack_click_delay = config.ignore_ack_click_delay;
        random_refresh_delay_lower = config.random_refresh_delay_lower;
        random_refresh_delay_upper = config.random_refresh_delay_upper;
        max_refresh_time = config.max_refresh_time;
        rage_stock_refresh = config.rage_stock_refresh;
        vibrate_time = config.vibrate_time;
        main_window_alpha = config.main_window_alpha;
        auto_click_notification = config.auto_click_notification;
        reset_floaty_position = config.reset_floaty_position;
        extra_selection_regex = config.extra_selection_regex !== undefined ? config.extra_selection_regex : "";

        // Update main window alpha if it exists
        if (w && w.main_window) {
            w.main_window.attr('alpha', main_window_alpha);
        }
    }

    function savePreset(slotNumber) {
        var config = getCurrentConfig();
        var presetName = getPresetName(slotNumber);
        storage.put('preset_' + slotNumber, JSON.stringify(config));
        console.info('[表情] 配置已保存到 ' + presetName + ' (槽位 ' + slotNumber + ')');
        toast('配置已保存到 ' + presetName);
    }

    function loadPreset(slotNumber) {
        var configString = storage.get('preset_' + slotNumber);
        if (configString) {
            try {
                var config = JSON.parse(configString);
                var presetName = getPresetName(slotNumber);
                loadConfig(config);
                updateConfigWindow();
                console.info('[表情] 配置已从 ' + presetName + ' (槽位 ' + slotNumber + ') 加载');
                toast('配置已从 ' + presetName + ' 加载');
                return true;
            } catch (e) {
                console.error('加载预设失败: ' + e);
                toast('加载预设失败');
                return false;
            }
        }
        return false;
    }

    function presetExists(slotNumber) {
        var configString = storage.get('preset_' + slotNumber);
        return configString && configString.length > 0;
    }

    function getPresetName(slotNumber) {
        var customName = storage.get('preset_name_' + slotNumber);
        return customName || ('预设 ' + slotNumber);
    }

    function setPresetName(slotNumber, name) {
        if (name && name.trim().length > 0) {
            storage.put('preset_name_' + slotNumber, name.trim());
        } else {
            storage.remove('preset_name_' + slotNumber);
        }
    }

    function deletePreset(slotNumber) {
        var presetName = getPresetName(slotNumber);
        storage.remove('preset_' + slotNumber);
        storage.remove('preset_name_' + slotNumber);
        console.info('[表情] 已删除预设: ' + presetName + ' (槽位 ' + slotNumber + ')');
        toast('已删除预设: ' + presetName);
    }

    function showPresetDialog() {
        hideConfigWindow();

        var presetOptions = [];

        for (var i = 1; i <= 5; i++) {
            var exists = presetExists(i);
            var presetName = getPresetName(i);
            var status = exists ? ' ✓' : ' (空)';
            var icon = exists ? '[表情]' : '[表情]';

            presetOptions.push(icon + ' ' + presetName + status);
        }

        presetOptions.push('[表情] 返回配置');

        dialogs.select('选择预设槽位', presetOptions).then((selectedIndex) => {
            if (selectedIndex === -1) {
                showConfigWindow();
                return;
            }

            if (selectedIndex === 5) { // Back option
                showConfigWindow();
                return;
            }

            var slotNumber = selectedIndex + 1;
            showPresetActionDialog(slotNumber);
        });
    }

    function showPresetActionDialog(slotNumber) {
        var exists = presetExists(slotNumber);
        var presetName = getPresetName(slotNumber);
        var actions = [];

        // Always allow save and rename
        actions.push('[表情] 保存当前配置');
        actions.push('[表情] 重命名预设');

        // Only allow load if preset exists
        if (exists) {
            actions.push('[表情] 加载此预设');
            actions.push('[表情] 删除此预设');
        }

        actions.push('[表情] 返回预设列表');

        var title = presetName + (exists ? ' ✓' : ' (空)');

        dialogs.select(title, actions).then((actionIndex) => {
            if (actionIndex === -1) {
                showPresetDialog();
                return;
            }

            var action = actions[actionIndex];

            if (action === '[表情] 保存当前配置') {
                dialogs.confirm('确认保存', '确定要将当前配置保存到 ' + presetName + ' 吗？' + (exists ? '\n\n[表情] 这将覆盖现有配置' : '')).then((confirmed) => {
                    if (confirmed) {
                        savePreset(slotNumber);
                    }
                    showConfigWindow();
                });

            } else if (action === '[表情] 加载此预设') {
                dialogs.confirm('确认加载', '确定要加载 ' + presetName + ' 的配置吗？\n\n[表情] 当前配置将被覆盖').then((confirmed) => {
                    if (confirmed) {
                        loadPreset(slotNumber);
                    }
                    showConfigWindow();
                });

            } else if (action === '[表情] 重命名预设') {
                var currentName = getPresetName(slotNumber);
                var defaultName = '预设 ' + slotNumber;
                var placeholder = currentName === defaultName ? '' : currentName;
                dialogs.rawInput('重命名预设（留空恢复默认）', placeholder, '').then((newName) => {
                    if (newName !== null) {
                        setPresetName(slotNumber, newName);
                        var finalName = newName && newName.trim().length > 0 ? newName.trim() : defaultName;
                        console.info('[表情] 预设 ' + slotNumber + ' 已重命名为: ' + finalName);
                        toast('预设已重命名为: ' + finalName);
                    }
                    showPresetActionDialog(slotNumber);
                });

            } else if (action === '[表情] 删除此预设') {
                dialogs.confirm('确认删除', '确定要删除 ' + presetName + ' 吗？\n\n[表情] 此操作不可恢复').then((confirmed) => {
                    if (confirmed) {
                        deletePreset(slotNumber);
                    }
                    showPresetDialog();
                });

            } else { // Back to preset list
                showPresetDialog();
            }
        });
    }

    function createConfigWindow() {
        try {
            configWindow = floaty.rawWindow(
                <vertical id="config_main" bg="#000000" alpha="0.95" padding="10" w="1px" h="1px">
                    <text text="[表情] 临时配置设置" gravity="center" textColor="#66ccff" textStyle="bold" textSize="18" />
                    <button text="关闭" id="close_config" bg="#F44336" w="*" h="40" margin="0 10" />
                    <button text="本地配置预设" id="preset_config" bg="#FFD700" w="*" h="40" />
                    <button text="" bg="#111111" w="10" h="10" />
                    <scroll>
                        <vertical>
                            <button id="delivery_type_config" text={"[表情] 配送方式: " + (purchase_type || "到店取")} bg="#66ccff" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="delivery_number_config" text={"[表情] 购买数量: " + (purchase_count || 1)} bg="#66ccff" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="specs_config" text={"[表情] 规格: " + (specs || "单个")} bg="#66ccff" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="extra_selection_regex_config" text={"[表情] 额外选择规则: " + (extra_selection_regex || "未设置")} bg="#66ccff" w="*" h="50" />
                            <button text="" bg="#111111" w="10" h="10" />

                            <button id="refresh_delay_config" text={"[表情] 库存刷新刷新延迟: " + refresh_delay + "ms"} bg="#4CAF50" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="enable_random_delay_config" text={"[表情] 额外随机库存刷新间隔: " + (enable_random_delay ? "开启" : "关闭")} bg="#4CAF50" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="random_delay_lower_config" text={"[表情] 随机延迟下限: " + random_refresh_delay_lower + "ms"} bg="#4CAF50" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="random_delay_upper_config" text={"[表情] 随机延迟上限: " + random_refresh_delay_upper + "ms"} bg="#4CAF50" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="max_refresh_time_config" text={"[表情] 最大刷新时间: " + max_refresh_time + "分钟"} bg="#4CAF50" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="rage_stock_refresh_config" text={"[表情] 狂暴库存刷新模式: " + (rage_stock_refresh ? "开启" : "关闭")} bg="#4CAF50" w="*" h="50" />
                            <button text="" bg="#111111" w="10" h="10" />

                            <button id="extra_delay_config" text={"[表情] 主动操作延迟: " + extra_delay + "ms"} bg="#2196F3" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="ack_delay_config" text={"[表情] 点击[我知道了]后等待的延迟: " + ack_delay + "ms"} bg="#2196F3" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button text="" bg="#111111" w="10" h="10" />

                            <button id="ignore_ack_config" text={"[表情] 特殊刷回流模式(不点击我知道了): " + (ignore_ack ? "开启" : "关闭")} bg="#E91E63" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="special_confirm_delay_config" text={"[表情] 特殊刷回流点击确认延迟: " + special_confirm_delay + "ms"} bg="#E91E63" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="ignore_ack_click_delay_config" text={"[表情] 特殊刷回流点击延迟: " + ignore_ack_click_delay + "ms"} bg="#E91E63" w="*" h="50" />
                            <button text="" bg="#111111" w="10" h="10" />

                            <button id="vibrate_time_config" text={"[表情] 抢购成功振动时长: " + vibrate_time + "ms"} bg="#3F51B5" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="main_window_alpha_config" text={"[表情] 窗口透明度: " + main_window_alpha} bg="#3F51B5" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="auto_click_notification_config" text={"[表情] 自动点击到货通知: " + (auto_click_notification ? "开启" : "关闭")} bg="#3F51B5" w="*" h="50" />
                            <button text="" bg="#111111" w="*" h="5" />
                            <button id="reset_floaty_position_config" text={"[表情] 重置悬浮窗位置: " + (reset_floaty_position ? "开启" : "关闭")} bg="#3F51B5" w="*" h="50" />

                        </vertical>
                    </scroll>
                </vertical>
            );

            if (!configWindow) {
                return;
            }

            // Initially hide the window off-screen
            configWindow.setPosition(-10000, -10000);
            configWindow.setTouchable(false);

            // Set initial state
            isConfigWindowVisible = false;

        } catch (e) {
            log("Error creating config window: " + e);
            configWindow = null;
            return;
        }

        configWindow.ignore_ack_config.click(function () {
            ignore_ack = !ignore_ack;
            console.info('[表情] 特殊刷回流模式已设置为: ', ignore_ack ? "开启" : "关闭");
            updateConfigWindow();
        });

        // Add click handlers for the new config options
        configWindow.delivery_type_config.click(function () {
            hideConfigWindow();
            dialogs.select('请选择配送方案', ['送到家', '到店取', '来回刷']).then((value) => {
                if (value !== -1) {
                    switch (value) {
                        case 0:
                            purchase_type = '送到家';
                            break;
                        case 1:
                            purchase_type = '到店取';
                            break;
                        case 2:
                            purchase_type = '来回刷';
                            break;
                    }
                    console.info('配送方案已设置为: ', purchase_type);
                    updateConfigWindow();
                }
                showConfigWindow();
            });
        });

        configWindow.delivery_number_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入购买数量', purchase_count).then((value) => {
                var newValue = parseInt(value);
                if (newValue > 0) {
                    purchase_count = newValue;
                    console.info('购买数量已设置为: ', purchase_count);
                    updateConfigWindow();
                } else {
                    console.info('请输入大于0的整数');
                }
                showConfigWindow();
            });
        });

        configWindow.specs_config.click(function () {
            hideConfigWindow();
            dialogs.select('请选择规格', ['单个', '整盒']).then((value) => {
                if (value !== -1) {
                    specs = value === 0 ? '单个' : '整盒';
                    console.info('规格已设置为: ', specs);
                    updateConfigWindow();
                }
                showConfigWindow();
            });
        });

        // Add click handlers for each config option
        configWindow.refresh_delay_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入库存刷新延迟 (毫秒)', refresh_delay).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 0) {
                    if (onFreeTrial) {
                        refresh_delay = 2000;
                        console.log("[表情] 试用期不支持修改库存刷新延迟");
                    } else {
                        refresh_delay = newValue;
                        console.info('[表情] 库存刷新延迟已设置为: ', refresh_delay + 'ms');
                    }
                    updateConfigWindow();
                } else {
                    console.info('请输入非负整数');
                }
                showConfigWindow();
            });
        });

        configWindow.enable_random_delay_config.click(function () {
            enable_random_delay = !enable_random_delay;
            console.info('[表情] 启用额外随机库存刷新间隔已设置为: ', enable_random_delay ? "开启" : "关闭");
            updateConfigWindow();
        });

        configWindow.extra_delay_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入主动操作延迟 (毫秒)', extra_delay).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 0) {
                    extra_delay = newValue;
                    console.info('主动操作延迟已设置为: ', extra_delay + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入非负整数');
                }
                showConfigWindow();
            });
        });

        configWindow.ack_delay_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入点击[我知道了]后等待的延迟 (毫秒)', ack_delay).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 0) {
                    ack_delay = newValue;
                    console.info('[表情] 点击[我知道了]后等待的延迟已设置为: ', ack_delay + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入非负整数');
                }
                showConfigWindow();
            });
        });

        configWindow.special_confirm_delay_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入特殊刷回流点击确认延迟 (毫秒)', special_confirm_delay).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 0) {
                    special_confirm_delay = newValue;
                    console.info('[表情] 特殊刷回流点击确认延迟已设置为: ', special_confirm_delay + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入非负整数');
                }
                showConfigWindow();
            });
        });

        configWindow.ignore_ack_click_delay_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入特殊刷回流点击延迟 (毫秒)', ignore_ack_click_delay).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 0) {
                    ignore_ack_click_delay = newValue;
                    console.info('[表情] 特殊刷回流点击延迟已设置为: ', ignore_ack_click_delay + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入非负整数');
                }
                showConfigWindow();
            });
        });

        configWindow.random_delay_lower_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入随机延迟下限 (毫秒)', random_refresh_delay_lower).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 1) {
                    random_refresh_delay_lower = newValue;
                    console.info('[表情] 随机延迟下限已设置为: ', random_refresh_delay_lower + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入大于0的整数');
                }
                showConfigWindow();
            });
        });

        configWindow.random_delay_upper_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入随机延迟上限 (毫秒)', random_refresh_delay_upper).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 1) {
                    random_refresh_delay_upper = newValue;
                    console.info('[表情] 随机延迟上限已设置为: ', random_refresh_delay_upper + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入大于0的整数');
                }
                showConfigWindow();
            });
        });

        configWindow.max_refresh_time_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入最大刷新时间 (分钟)', max_refresh_time).then((value) => {
                var newValue = parseFloat(value);
                if (newValue >= 0) {
                    max_refresh_time = newValue;
                    console.info('最大刷新时间已设置为: ', max_refresh_time + '分钟');
                    updateConfigWindow();
                } else {
                    console.info('请输入非负数');
                }
                showConfigWindow();
            });
        });

        configWindow.rage_stock_refresh_config.click(function () {
            rage_stock_refresh = !rage_stock_refresh;
            console.info('[表情] 狂暴库存刷新模式已设置为: ', rage_stock_refresh ? "开启" : "关闭");
            updateConfigWindow();
        });

        configWindow.vibrate_time_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入抢购成功振动时长 (毫秒)', vibrate_time).then((value) => {
                var newValue = parseInt(value);
                if (newValue >= 0) {
                    vibrate_time = newValue;
                    console.info('抢购成功振动时长已设置为: ', vibrate_time + 'ms');
                    updateConfigWindow();
                } else {
                    console.info('请输入非负整数');
                }
                showConfigWindow();
            });
        });

        configWindow.main_window_alpha_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入窗口透明度 (0.0-1.0)', main_window_alpha).then((value) => {
                var newValue = parseFloat(value);
                if (newValue >= 0.0 && newValue <= 1.0) {
                    main_window_alpha = newValue;
                    w.main_window.attr('alpha', main_window_alpha);
                    console.info('[表情] 窗口透明度已设置为: ', main_window_alpha);
                    updateConfigWindow();
                } else {
                    console.info('请输入0.0到1.0之间的数值');
                }
                showConfigWindow();
            });
        });

        configWindow.auto_click_notification_config.click(function () {
            auto_click_notification = !auto_click_notification;
            console.info('[表情] 自动点击到货通知已设置为: ', auto_click_notification ? "开启" : "关闭");
            updateConfigWindow();
        });

        configWindow.reset_floaty_position_config.click(function () {
            reset_floaty_position = !reset_floaty_position;
            console.info('[表情] 重置悬浮窗位置已设置为: ', reset_floaty_position ? "开启" : "关闭");
            updateConfigWindow();
        });

        configWindow.extra_selection_regex_config.click(function () {
            hideConfigWindow();
            dialogs.rawInput('请输入额外选择规则 (支持 | 或 ｜ 分隔，如: A组|7.29｜黑)', extra_selection_regex || '').then((value) => {
                if (value !== null) {
                    extra_selection_regex = value.trim();
                    if (extra_selection_regex.length > 0) {
                        console.info('[表情] 额外选择规则已设置为: ', extra_selection_regex);
                    } else {
                        console.info('[表情] 额外选择规则已清空');
                    }
                    updateConfigWindow();
                }
                showConfigWindow();
            });
        });

        configWindow.close_config.click(function () {
            hideConfigWindow();
        });

        configWindow.preset_config.click(function () {
            showPresetDialog();
        });

        return configWindow;
    }

    function showConfigWindow() {
        if (configWindow && !isConfigWindowVisible) {
            try {
                ui.post(() => {
                    // Center the window and make it touchable
                    var windowWidth = Math.floor(device.width * 0.8) + "px";
                    var windowHeight = Math.floor(device.height * 0.8) + "px";
                    //set manually
                    configWindow.config_main.attr('w', windowWidth);
                    configWindow.config_main.attr('h', windowHeight);
                    var windowWidth = device.width * 0.8 || device.width * 0.8;
                    var windowHeight = device.height * 0.8 || device.height * 0.8;
                    var centerX = Math.floor(device.width / 2 - windowWidth / 2);
                    var centerY = Math.floor(device.height / 2 - windowHeight / 2);
                    configWindow.setPosition(centerX, centerY);
                    configWindow.setTouchable(true);
                    isConfigWindowVisible = true;
                });
                updateConfigWindow();
            } catch (e) {
                log("Error showing config window: " + e);
            }
        }
    }

    function hideConfigWindow() {
        if (configWindow && isConfigWindowVisible) {
            try {
                ui.post(() => {
                    // Move off-screen and make it non-touchable
                    configWindow.setPosition(-10000, -10000);
                    configWindow.setTouchable(false);
                    isConfigWindowVisible = false;
                });
            } catch (e) {
                log("Error hiding config window: " + e);
            }
        }
    }

    function toggleConfigWindow() {
        try {
            if (isConfigWindowVisible) {
                hideConfigWindow();
            } else {
                showConfigWindow();
            }
        } catch (e) {
            log("Error toggling config window: " + e);
        }
    }

    function updateConfigWindow() {
        if (configWindow) {
            try {
                configWindow.delivery_type_config.setText("[表情] 配送方式: " + (purchase_type || "到店取"));
                configWindow.delivery_number_config.setText("[表情] 配送数量: " + (purchase_count || 1));
                configWindow.specs_config.setText("[表情] 规格: " + (specs || "单个"));
                configWindow.refresh_delay_config.setText("[表情] 库存刷新刷新延迟: " + refresh_delay + "ms");
                configWindow.enable_random_delay_config.setText("[表情] 启用额外随机库存刷新间隔: " + (enable_random_delay ? "开启" : "关闭"));
                configWindow.extra_delay_config.setText("[表情] 主动操作延迟: " + extra_delay + "ms");
                configWindow.ack_delay_config.setText("[表情] 点击[我知道了]后等待的延迟: " + ack_delay + "ms");
                configWindow.ignore_ack_config.setText("[表情] 特殊刷回流模式(不点击我知道了): " + (ignore_ack ? "开启" : "关闭"));
                configWindow.special_confirm_delay_config.setText("[表情] 特殊刷回流点击确认延迟: " + special_confirm_delay + "ms");
                configWindow.ignore_ack_click_delay_config.setText("[表情] 特殊刷回流点击延迟: " + ignore_ack_click_delay + "ms");
                configWindow.random_delay_lower_config.setText("[表情] 随机延迟下限: " + random_refresh_delay_lower + "ms");
                configWindow.random_delay_upper_config.setText("[表情] 随机延迟上限: " + random_refresh_delay_upper + "ms");
                configWindow.max_refresh_time_config.setText("[表情] 最大刷新时间: " + max_refresh_time + "分钟");
                configWindow.rage_stock_refresh_config.setText("[表情] 狂暴库存刷新模式: " + (rage_stock_refresh ? "开启" : "关闭"));
                configWindow.vibrate_time_config.setText("[表情] 抢购成功振动时长: " + vibrate_time + "ms");
                configWindow.main_window_alpha_config.setText("[表情] 窗口透明度: " + main_window_alpha);
                configWindow.auto_click_notification_config.setText("[表情] 自动点击到货通知: " + (auto_click_notification ? "开启" : "关闭"));
                configWindow.reset_floaty_position_config.setText("[表情] 重置悬浮窗位置: " + (reset_floaty_position ? "开启" : "关闭"));
                configWindow.extra_selection_regex_config.setText("[表情] 额外选择规则: " + (extra_selection_regex || "未设置"));
            } catch (e) {
                log("Error updating config window: " + e);
            }
        }
    }
    if (!use_minimal_floaty) {
        w.config_settings.click(function () {
            ui.post(() => {
                try {
                    if (!configWindow) {
                        configWindow = createConfigWindow();

                        var windowWidth = String(device.width * 0.8) + "px";
                        var windowHeight = String(device.height * 0.8) + "px";

                        configWindow.config_main.attr('w', windowWidth);
                        configWindow.config_main.attr('h', windowHeight);
                        sleep(500);
                    }

                    toggleConfigWindow();
                } catch (e) {
                    log("Error in config button click: " + e);
                }
            });
        });
    }

    var posX = storage.get('floaty_position_x');
    var posY = storage.get('floaty_position_y');
    var defaultX = device.width / 2 + 100;
    var defaultY = w.getY() + 100;
    if (typeof posX === 'number' && typeof posY === 'number' && posX >= 0 && posX + 100 <= device.width && !reset_floaty_position) {
        console.warn("[提示] 悬浮窗位置已读取");
        w.setPosition(posX, posY);
    } else {
        console.warn("[提示] 已使用默认悬浮窗位置");
        w.setPosition(defaultX, defaultY);
    }


    // Initialize configuration window (hidden by default)
    var configWindow = createConfigWindow();

}

function clickNotifyBtn() {
    var btn = className("android.widget.TextView").text("到货通知").findOne(50);
    if (btn) {
        console.warn("[操作] 已点击到货通知按钮");
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
            if (child.childCount() != 0) {
                maxOrder = order;
                highestOrderChild = child;
            }

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
    if (!parent1) {
        return null;
    }
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
    var count = webview_parent_node.childCount();
    if (count == 0) {
        return null;
    }

    var maxOrder = 0;
    var maxOrderIndex = count - 1;
    var hasZeroOrder = false;

    for (var i = 0; i < count; i++) {
        var child = webview_parent_node.child(i);
        var header = get_header_text(child);
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

        var info_page_last_button = find_info_page_last_button(current_webview);
        if (info_page_last_button && info_page_last_button.text() == "立即购买") {
            return { header: header_text, status: "info_page" };
        }



        return { header: header_text, status: "default" };
    } else {
        return { header: header_text, status: "default" };
    }
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
        console.warn("[操作] 当前已满足购买数量要求: " + current);
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
        payment_page_confirm_btn_retry_count = 0;
        tried_clicked_confirm_to_pay_page_count = 0;
        submited_refresh_flag = false;
        submited_refresh_count = 0;
        sleep(100);
        continue;
    }
    // log("===start===")
    sleep(50);
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
            tried_clicked_confirm_to_pay_page_count = 0;
            var ignore_next_purchase_page_flag = false;
            rebuy_flag = true;
            if (!current_webview) {
                if (debug_mode_conf) {
                    log("Cannot find current webview.");
                }
                sleep(10);
                break;
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

            // console.time("find_confirm_btn");
            var confirm_btn = null;
            if (last_view.childCount() == 4) {
                var confirm_btn = last_view.child(3);
            } else if (last_view.childCount() == 8) {
                var confirm_btn = last_view.child(7);
                if (confirm_btn.text() != "确认信息并支付") {
                    confirm_btn = null;
                }
            }
            // console.timeEnd("find_confirm_btn");
            if (confirm_btn) {
                dc_streak = 0;
                payment_page_confirm_btn_retry_count++;

                // Use physical click if clicked 4 times without seeing double confirm
                if (payment_page_confirm_btn_retry_count >= 4) {
                    clickButton(confirm_btn);
                    if (debug_mode_conf) {
                        console.error("clicked confirm_btn (physical click)");
                    }
                    sleep(100);
                } else {
                    confirm_btn.click();
                    if (debug_mode_conf) {
                        console.error("clicked confirm_btn");
                    }
                }
                // console.error("confirm_btn click");
                sleep(extra_delay);
                break;
            }

            // console.time("find_double_confirm");
            var double_confirm = null;
            if (last_view.childCount() == 2) {
                var second_child = last_view.child(1);
                if (second_child && second_child.className() === "android.view.View") {
                    if (second_child.childCount() == 1) {
                        var inner_view = second_child.child(0);
                        if (inner_view && inner_view.className() === "android.view.View") {
                            double_confirm = inner_view.child(inner_view.childCount() - 1);
                        }
                    }
                }
            }
            // console.timeEnd("find_double_confirm");
            if (double_confirm) {
                // Reset confirm button retry count since we found double confirm
                payment_page_confirm_btn_retry_count = 0;

                if (dc_streak == 0) {
                    // console.error("double_confirm click");
                    last_double_confirm_time = new Date().getTime();
                    double_confirm.click();
                    if (debug_mode_conf) {
                        console.error("clicked double_confirm");
                    }
                    submit_flag = true;
                    dc_streak++;
                    sleep(250 + extra_delay);
                } else if (dc_streak >= 8) {
                    clickButton(double_confirm);
                    if (debug_mode_conf) {
                        console.error("clicked double_confirm (clickButton)");
                    }
                    submit_flag = true;
                    dc_streak = 0;
                } else {
                    dc_streak++;
                    sleep(20);
                }
                break;
            }


            if (ignore_ack) {
                var acknowledge = current_webview.findOne(text("我知道了").algorithm('DFS'));
            } else {
                var acknowledge = last_view.findOne(text("我知道了").algorithm('DFS'));
            }
            if (acknowledge) {
                payment_page_confirm_btn_retry_count = 0;
                if (!ignore_ack) {
                    // console.error("click acknowledge");
                    acknowledge.click();
                    if (debug_mode_conf) {
                        console.error("clicked acknowledge");
                    }
                    sleep(100 + extra_delay + ack_delay);
                } else {
                    var hidden_double_confirm = current_webview.findOne(textMatches(/(确认无误|就是这家)/).algorithm('DFS'));
                    if (hidden_double_confirm) {
                        if (dc_streak == 0) {
                            last_double_confirm_time = new Date().getTime();
                            hidden_double_confirm.click();
                            submit_flag = true;
                            dc_streak++;
                            sleep(ignore_ack_click_delay);
                            break;
                        }
                    }

                    var hidden_confirm_btn = current_webview.findOne(text("确认信息并支付").algorithm('DFS'));
                    if (hidden_confirm_btn) {
                        dc_streak = 0;
                        hidden_confirm_btn.click();
                        sleep(ignore_ack_click_delay);
                        submit_flag = false;
                        break;
                    }
                }
                submit_flag = false;

                break;
            }




            break;
        case "info_page":
            submit_flag = false;
            ignore_next_purchase_page_flag = false;
            if (!rebuy_flag) {
                sleep(100);
                var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (!confirm_btn) {
                    var purchase_btn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (purchase_btn) {
                        purchase_btn.click();
                    }
                    sleep(400);
                }
            } else {
                var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (!confirm_btn) {
                    rebuy_flag = false;
                }
                sleep(150);
            }
            // Acknowledge page logic
            break;
        case "error":
            // rebuy_flag = false;
            // submit_flag = false;
            log("访问异常");
            text("我知道了").click();
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
                var purchase_type_text = current_webview.findOne(text("购买方式").algorithm('DFS'));
                if (purchase_type_text) {
                    if (purchase_type != '来回刷') {
                        log("当前可以选择购买方式");
                        var purchase_type_btn = current_webview.findOne(text(purchase_type).algorithm('DFS'));
                        if (purchase_type_btn) {
                            purchase_type_btn.click();
                        }
                        log("已选择购买方式：" + purchase_type);
                        sleep(50);
                    }

                }
                var specs_text = current_webview.findOne(text("选择规格").algorithm('DFS'));
                if (specs_text) {
                    log("当前可以选择规格");
                    var specs_btn = current_webview.findOne(textStartsWith(specs).algorithm('DFS'));
                    if (specs_btn) {
                        specs_btn.click();
                    }
                    log("已选择规格：" + specs);
                    sleep(100 + extra_delay);
                }

                if (purchase_type_text && extra_selection_regex && extra_selection_regex.trim() !== "") {
                    var selection_parent = purchase_type_text.parent();
                    if (selection_parent) {
                        // Process user input: support both "|" and "｜", add fuzzy matching
                        var user_terms = extra_selection_regex
                            .replace(/｜/g, "|")  // Replace Chinese pipe with regular pipe
                            .split("|")           // Split by pipe
                            .map(function (term) {
                                return term.trim();
                            })
                            .filter(function (term) {
                                return term.length > 0;
                            })
                            .map(function (term) {
                                return ".*" + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ".*";
                            }); // Add fuzzy matching and escape special regex chars

                        if (user_terms.length > 0) {
                            var search_regex = user_terms.join("|");
                            console.info("[表情] 使用额外选择规则: ", extra_selection_regex);

                            var texts = selection_parent.find(textMatches(search_regex).algorithm('BFS'));
                            if (texts) {
                                for (var i = 0; i < texts.length; i++) {
                                    var temp_text = texts[i];
                                    if (temp_text) {
                                        temp_text.click();
                                        console.error("已点击额外选择: ", temp_text.text());
                                        sleep(10);
                                    }
                                }
                            }
                        }
                    }
                }
                if (auto_click_notification) {
                    clickNotifyBtn();
                }
                var confirm_btn = find_confirm_btn(current_webview);
                var refreshTimeStart = new Date();
                var current_selection = "到店取";
                while (!confirm_btn && !rebuy_flag) {
                    // max duration logic
                    if (max_refresh_time > 0) {
                        var currentTime = new Date();
                        if ((currentTime - refreshTimeStart) > 1000 * 60 * max_refresh_time) {
                            script_status = 0;
                            ui.post(() => {
                                if (!use_minimal_floaty) {
                                    w.end.attr('visibility', 'gone');
                                    w.start.attr('visibility', 'visible');
                                } else {
                                    w.text_status.setText('启动');
                                    try {
                                        w.drag.attr('tint', '#66ccff'); // Material Design green
                                    } catch (e) {
                                        console.error("Failed to set image tint:", e);
                                    }
                                }
                            });
                            var seconds = parseFloat((max_refresh_time * 60).toFixed(2));
                            console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟(", seconds, "秒) ", "，脚本已停止");
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
                        confirm_btn = find_confirm_btn(current_webview);
                        if (confirm_btn) {
                            break;
                        }
                        // safe stock check logic
                        if (!rage_stock_refresh) {
                            var sold_out = is_empty_stock(current_webview);
                            var refresh_retry = 0;
                            var timeout_flag = false;
                            var now = new Date().getTime();
                            var purchase_elapsed = now - last_purchase_now_time;
                            if (purchase_elapsed > Math.max(refresh_delay, 200)) {
                                console.error("正在判断库存情况...");
                            }
                            while (!sold_out) {
                                refresh_retry++;
                                if (refresh_retry > 30) {
                                    timeout_flag = true;
                                    sleep(20);
                                    break;
                                }
                                sold_out = is_empty_stock(current_webview);
                                if (sold_out) {
                                    break;
                                }

                                if (auto_click_notification && click_new_notification) {
                                    clickNotifyBtn();
                                }
                                sleep(20);
                                confirm_btn = find_confirm_btn(current_webview);
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
                            var now = new Date().getTime();
                            var purchase_elapsed = now - last_purchase_now_time;
                            if (purchase_elapsed > Math.max(refresh_delay, 200)) {
                                if (sold_out) {
                                    console.warn("已售罄");
                                } else if (confirm_btn) {
                                    console.warn("有库存");
                                }
                            }


                            // refresh logic
                            if (timeout_flag || sold_out) {
                                if (sku_result_toast_conf) {
                                    click_plus_btn(current_webview);
                                }
                                if (purchase_type != '来回刷') {
                                    if (!rebuy_flag) {
                                        var now = new Date().getTime();
                                        var purchase_elapsed = now - last_purchase_now_time;
                                        if (purchase_elapsed < Math.max(refresh_delay, 200)) {
                                            if (debug_mode_conf) {
                                                console.error("purchase_elapsed < Math.max(refresh_delay, 200), continue");
                                            }

                                            refresh_timeout_count++;
                                            if (refresh_timeout_count > 10) {
                                                console.error("检测到库存刷新存在延迟，当前链接可能有风控，请尝试更换门店直链");
                                                refresh_timeout_count = 0;
                                            }
                                            continue;
                                        }
                                        refresh_timeout_count = 0;
                                        last_purchase_now_time = now;
                                        purchase_btn.click();
                                    }

                                } else {
                                    var current_selection_btn = current_webview.findOne(text(current_selection).algorithm('DFS'));
                                    if (current_selection_btn) {
                                        if (debug_mode_conf) {
                                            console.error("clicked current_selection_btn: ", current_selection);
                                        }
                                        current_selection_btn.click();
                                        if (current_selection == '到店取') {
                                            current_selection = '送到家';
                                        } else {
                                            current_selection = '到店取';
                                        }
                                        sleep(100);
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
                                    sleep(100);
                                }
                            }
                        }

                    }

                    confirm_btn = find_confirm_btn(current_webview);
                    if (confirm_btn) {
                        if (debug_mode_conf) {
                            console.error("confirm_btn found in purchase, break");
                        }
                        break;
                    }
                    var random_delay = Math.floor(Math.random() * (random_refresh_delay_upper - random_refresh_delay_lower + 1)) + random_refresh_delay_lower;
                    if (!enable_random_delay) {
                        random_delay = 0;
                    }

                    var sleepTarget = refresh_delay + random_delay;
                    sleep(sleepTarget);
                    confirm_btn = find_confirm_btn(current_webview);
                    if (confirm_btn) break;

                    purchase_count_label = current_webview.findOne(text("数量").algorithm('DFS'));
                    if (!purchase_count_label) {
                        break;
                    }

                    console.info("[注意] 库存刷新耗时: ", refresh_delay + random_delay, "ms");
                    confirm_btn = find_confirm_btn(current_webview);
                    if (confirm_btn) {
                        if (debug_mode_conf) {
                            console.error("confirm_btn found in purchase, break");
                        }
                        break;
                    }

                }
                if (script_status == 0) {
                    continue;
                }

                if (purchase_count > 1) {
                    var purchase_count_text = current_webview.findOne(text("数量").algorithm('DFS'));
                    if (purchase_count_text) {
                        satisfyPurchaseCount(current_webview, purchase_count);
                        log("已满足购买数量要求: ", purchase_count);
                    }
                } else {
                    log("目标购买数量为1，跳过购买数量判断");
                }
            }

            confirm_btn = find_confirm_btn(current_webview);
            // add retry count if not confirm_btn found for like 10 times, then disable the rebuy_flag
            if (confirm_btn) {
                if (debug_mode_conf) {
                    console.error("confirm_btn found in purchase, try to click");
                }
                confirm_btn_retry_count = 0;
                if (ignore_ack) {
                    if (!rebuy_flag) {
                        var now = new Date().getTime();
                        var elapsed = now - last_confirm_time;
                        if (elapsed >= 450) {
                            last_confirm_time = now;
                            confirm_btn.click();
                            rebuy_flag = true;
                            ignore_next_purchase_page_flag = true;
                            sleep(150 + extra_delay);
                            continue;
                        }
                    }
                    var now = new Date().getTime();
                    var elapsed = now - last_double_confirm_time;
                    if (elapsed >= special_confirm_delay) {
                        console.warn("[等待] 确认按钮点击时间已超过", special_confirm_delay, "ms，点击确认");

                        if (tried_clicked_confirm_to_pay_page_count >= 2) {
                            clickButton(confirm_btn);
                            tried_clicked_confirm_to_pay_page_count = 0;
                            if (debug_mode_conf) {
                                console.error("clicked confirm_btn (physical click)");
                            }
                        } else {
                            var now = new Date().getTime();
                            var elapsed = now - last_confirm_time;
                            if (elapsed >= 450) {
                                last_confirm_time = now;
                                confirm_btn.click();
                            }
                            tried_clicked_confirm_to_pay_page_count++;
                        }
                        rebuy_flag = true;
                        ignore_next_purchase_page_flag = true;
                    } else {
                        console.warn("[等待] 为防止反复被打回， 等待", special_confirm_delay - elapsed, "ms后点击确认");
                        sleep(special_confirm_delay - elapsed);

                        if (tried_clicked_confirm_to_pay_page_count >= 2) {
                            clickButton(confirm_btn);
                            tried_clicked_confirm_to_pay_page_count = 0;
                            if (debug_mode_conf) {
                                console.error("clicked confirm_btn (physical click)");
                            }
                        } else {
                            var now = new Date().getTime();
                            var elapsed = now - last_confirm_time;
                            if (elapsed >= 450) {
                                last_confirm_time = now;
                                confirm_btn.click();
                            }
                            tried_clicked_confirm_to_pay_page_count++;
                        }
                        rebuy_flag = true;
                        ignore_next_purchase_page_flag = true;
                    }
                } else {
                    var now = new Date().getTime();
                    var elapsed = now - last_confirm_time;
                    if (elapsed >= 450) {
                        if (tried_clicked_confirm_to_pay_page_count >= 2) {
                            clickButton(confirm_btn);
                            tried_clicked_confirm_to_pay_page_count = 0;
                            if (debug_mode_conf) {
                                console.error("clicked confirm_btn (physical click)");
                            }
                        } else {
                            last_confirm_time = now;
                            if (debug_mode_conf) {
                                console.error("clicked confirm_btn)");
                            }
                            if (!rebuy_flag && special_click_confirm) {
                                // clickButton(confirm_btn);
                                confirm_btn.click();
                            } else {
                                confirm_btn.click();
                            }
                            tried_clicked_confirm_to_pay_page_count++;
                        }
                        rebuy_flag = true;
                        ignore_next_purchase_page_flag = true;
                    }
                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                }
                sleep(150 + extra_delay);
            } else {
                confirm_btn_retry_count++;
                if (confirm_btn_retry_count >= 10) {
                    confirm_btn_retry_count = 0;
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    ignore_next_purchase_page_flag = false;
                    sleep(20);
                    break;
                }
            }
            break;
        case "purchase_ready":
            var confirm_btn = find_confirm_btn(current_webview);
            if (confirm_btn) {
                confirm_btn.click();
            }
            sleep(200);
            break;
        case "default":
            // Default logic
            break;
        case "no_webview":
            // log("No current webview found");
            break;
        default:
            // log("Unknown status: " + page_info.status);
            break;
    }
}