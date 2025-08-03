// var ivbiad;
// try{
// 	ivbiad=hamibot;
// }catch(_0x24002a){
// 	ivbiad=null;
// }
function waitTime(_0x200a93){
	while(Date.now()<=_0x200a93){
		sleep(10);
	}
}
var type_ivbiad=null;
var isRunning=false;
var mainThread=null;
var timeMonitorThread=null;
var scriptStartTime=0;
var before22RefreshMs=0;
var lastAutoRestartTime=Date.now();
var autoRestartIntervalMs=10000;
var isAutoRestarting=false;
var savedScriptStartTime=0;
var key=null;
var char1=32418;
var char2=20013;
var char3=33050;
var char4=26412;
var scriptName=String.fromCharCode(char1)+String.fromCharCode(char2)+String.fromCharCode(char3)+String.fromCharCode(char4);
var paymentThread=null;
var paymentStartFlag=false;
var window=null;
var calibrationWindow=null;
var windowBaseHeight=200;
var windowExtendedHeight=350;
var isPanelOpen=false;
var isConfigPanelOpen=false;
var before10RefreshMs=0;
type_ivbiad=typeof ivbiad;
var calibrationStatus={'pay':false,'thisHome':false,'confirmWuWu':false};
var precomputedCoords={'pay':{'x':0,'y':0},'thisHome':{'x':0,'y':0},'confirmWuWu':{'x':0,'y':0}};
console.log('=== PPMT脚本开始启动 ===');
console.log('正在初始化...');
var CONFIG_STORAGE_NAME='com.superpanda.ppmt.config';
var configStorage=storages.create(CONFIG_STORAGE_NAME);
var defaultConfig={'deliveryMode':0,'refreshTime':600,'clickMode':0,'payWait':450,'addressWait':450,'confirmWait':700,'vibrateTime':2000,'showConsole':false,'debugMode':0,'antiBlackMode':true,'pauseInterval':10,'payPos':null,'thisHomePos':null,'confirmWuWuPos':null,'calibrationStatus':{'pay':false,'thisHome':false,'confirmWuWu':false},'box':false,'add2':false,'fastAdd2':false,'loopAdd2':false,'arrivalNotify':true,'reflowSpeedMode':true,'windowX':null,'windowY':null,'autoRun':false,'adaptiveReflowMode':false,'adaptiveReflowTime':2.5,'reflowMinus1':false};
function loadConfig(){
	try{
		var _0x5de25e=configStorage.get('config');
		if(_0x5de25e&&typeof _0x5de25e==='object'){
			var _0x559563=Object.assign({},defaultConfig,_0x5de25e);
			if(_0x559563.debugMode<0||_0x559563.debugMode>2){
				_0x559563.debugMode=0;
			}
			if(_0x559563.refreshTime<0){
				_0x559563.refreshTime=0;
			}
			return _0x559563;
		}
	}catch(_0x23423a){
		console.warn('加载配置失败：'+_0x23423a);
	}
	return Object.assign({},defaultConfig);
}
function saveConfig(){
	try{
		configStorage.put('config',config);
		debugLog('配置已保存',2);
	}catch(_0x2dfba5){
		console.warn('保存配置失败：'+_0x2dfba5);
	}
}
var fbasildas=null;
var useConfigTiming=false;
var autoRunEnabled=false;
try{
	if(typeof ivbiad!=='undefined'&&ivbiad.env){
		if(ivbiad.env.use_config_timing==true||ivbiad.env.use_config_timing=='true'){
			useConfigTiming=true;
			console.log('检测到配置文件启用延时配置，将使用配置文件中的延时参数');
		}
		if(ivbiad.env.auto_run!==undefined){
			autoRunEnabled=ivbiad.env.auto_run===true||ivbiad.env.auto_run==='true';
			console.log('自动运行开关已设置为: '+(autoRunEnabled?'开启':'关闭'));
		}
	}
}catch(_0x1e189a){
	console.log('获取配置文件参数失败: '+_0x1e189a);
}
var config=loadConfig();
const{name,model,onFreeTrial}=ivbiad.plan;
log('用户的定价模式:'+name);
if(name!='1设备'){
	if(useConfigTiming==true&&typeof ivbiad!=='undefined'&&ivbiad.env){
		if(ivbiad.env.delivery_mode!==undefined){
			config.deliveryMode=parseInt(ivbiad.env.delivery_mode)||0;
		}
		if(ivbiad.env.refresh_time!==undefined){
			var refreshTime=parseInt(ivbiad.env.refresh_time)||600;
			if(refreshTime<0){
				refreshTime=0;
			}
			config.refreshTime=refreshTime;
		}
		if(ivbiad.env.click_mode!==undefined){
			config.clickMode=parseInt(ivbiad.env.click_mode)||0;
		}
		if(ivbiad.env.pay_wait!==undefined){
			config.payWait=parseInt(ivbiad.env.pay_wait)||300;
		}
		if(ivbiad.env.address_wait!==undefined){
			config.addressWait=parseInt(ivbiad.env.address_wait)||300;
		}
		if(ivbiad.env.confirm_wait!==undefined){
			config.confirmWait=parseInt(ivbiad.env.confirm_wait)||700;
		}
		if(ivbiad.env.vibrate_time!==undefined){
			config.vibrateTime=parseInt(ivbiad.env.vibrate_time)||2000;
		}
		if(ivbiad.env.show_console!==undefined){
			config.showConsole=ivbiad.env.show_console===true||ivbiad.env.show_console==='true';
		}
		if(ivbiad.env.debug_mode!==undefined){
			config.debugMode=parseInt(ivbiad.env.debug_mode)||0;
		}
		if(ivbiad.env.anti_black_mode!==undefined){
			config.antiBlackMode=ivbiad.env.anti_black_mode===true||ivbiad.env.anti_black_mode==='true';
		}
		if(ivbiad.env.pause_interval!==undefined){
			config.pauseInterval=parseInt(ivbiad.env.pause_interval)||10;
		}
		if(ivbiad.env.box_mode!==undefined){
			config.box=ivbiad.env.box_mode===true||ivbiad.env.box_mode==='true';
		}
		if(ivbiad.env.add2_mode!==undefined){
			config.add2=ivbiad.env.add2_mode===true||ivbiad.env.add2_mode==='true';
		}
		if(ivbiad.env.fast_add2_mode!==undefined){
			config.fastAdd2=ivbiad.env.fast_add2_mode===true||ivbiad.env.fast_add2_mode==='true';
		}
		if(ivbiad.env.loop_add2_mode!==undefined){
			config.loopAdd2=ivbiad.env.loop_add2_mode===true||ivbiad.env.loop_add2_mode==='true';
		}
		if(ivbiad.env.arrival_notify!==undefined){
			config.arrivalNotify=ivbiad.env.arrival_notify===true||ivbiad.env.arrival_notify==='true';
		}
		if(ivbiad.env.reflow_speed_mode!==undefined){
			config.reflowSpeedMode=ivbiad.env.reflow_speed_mode===true||ivbiad.env.reflow_speed_mode==='true';
		}
		if(ivbiad.env.auto_run!==undefined){
			config.autoRun=ivbiad.env.auto_run===true||ivbiad.env.auto_run==='true';
		}
		if(ivbiad.env.adaptive_reflow_mode!==undefined){
			config.adaptiveReflowMode=ivbiad.env.adaptive_reflow_mode===true||ivbiad.env.adaptive_reflow_mode==='true';
		}
		if(ivbiad.env.adaptive_reflow_time!==undefined){
			config.adaptiveReflowTime=parseFloat(ivbiad.env.adaptive_reflow_time)||2.5;
		}
		if(ivbiad.env.reflow_minus1!==undefined){
			config.reflowMinus1=ivbiad.env.reflow_minus1===true||ivbiad.env.reflow_minus1==='true';
		}
		if(ivbiad.env.reflow_minus1!==undefined){
			config.reflowMinus1=ivbiad.env.reflow_minus1===true||ivbiad.env.reflow_minus1==='true';
		}
		if(ivbiad.env.before22RefreshMs!==undefined){
			before22RefreshMs=parseInt(ivbiad.env.before22RefreshMs)||0;
		}
		console.log('已从配置文件覆盖以下参数:');
		console.log('- 配送方式: '+(config.deliveryMode===0?'送到家':'到店取'));
		console.log('- 刷新等待: '+config.refreshTime+'ms');
		console.log('- 运行模式: '+(config.clickMode===0?'点击模式':'搜索模式'));
		console.log('- 支付确认等待: '+config.payWait+'ms');
		console.log('- 地址确认等待: '+config.addressWait+'ms');
		console.log('- 确认按钮等待: '+config.confirmWait+'ms');
		console.log('- 震动时间: '+config.vibrateTime+'ms');
		console.log('- 显示控制台: '+(config.showConsole?'是':'否'));
		console.log('- 调试模式: '+(config.debugMode===0?'关闭':config.debugMode===1?'精简':'完全'));
		console.log('- 防黑号模式: '+(config.antiBlackMode?'开启':'关闭'));
		console.log('- 自动停止时长: '+config.pauseInterval+'分钟');
		console.log('- 自适应回流模式: '+(config.adaptiveReflowMode?'开启':'关闭'));
		console.log('- 自适应回流开启时间: '+config.adaptiveReflowTime+'分钟');
		console.log('- 回流-1模式: '+(config.reflowMinus1?'开启':'关闭'));
		console.log('- 端盒模式: '+(config.box?'是':'否'));
		console.log('- 数量加2: '+(config.add2?'是':'否'));
		console.log('- 连续+2: '+(config.loopAdd2?'是':'否'));
		console.log('- 极速+2: '+(config.fastAdd2?'是':'否'));
		console.log('- 到货通知: '+(config.arrivalNotify?'是':'否'));
		console.log('- 回流极速模式: '+(config.reflowSpeedMode?'是':'否'));
		console.log('- 自动运行: '+(config.autoRun?'是':'否'));
		saveConfig();
	}
}
var pay_pos=config.payPos;
var thisHome_pos=config.thisHomePos;
var confirmWuWu_pos=config.confirmWuWuPos;
var queding_pos;
var calibrationStatus=config.calibrationStatus||{'pay':false,'thisHome':false,'confirmWuWu':false};
updatePrecomputedCoords();
function updatePrecomputedCoords(){
	if(pay_pos&&pay_pos.length>=4){
		precomputedCoords.pay.x=pay_pos[0]+(pay_pos[2]-pay_pos[0])/2;
		precomputedCoords.pay.y=pay_pos[1]+(pay_pos[3]-pay_pos[1])/2;
	}
	if(thisHome_pos&&thisHome_pos.length>=4){
		precomputedCoords.thisHome.x=thisHome_pos[0]+(thisHome_pos[2]-thisHome_pos[0])/2;
		precomputedCoords.thisHome.y=thisHome_pos[1]+(thisHome_pos[3]-thisHome_pos[1])/2;
	}
	if(confirmWuWu_pos&&confirmWuWu_pos.length>=4){
		precomputedCoords.confirmWuWu.x=confirmWuWu_pos[0]+(confirmWuWu_pos[2]-confirmWuWu_pos[0])/2;
		precomputedCoords.confirmWuWu.y=confirmWuWu_pos[1]+(confirmWuWu_pos[3]-confirmWuWu_pos[1])/2;
	}
	debugLog('预计算坐标已更新 - 支付:'+precomputedCoords.pay.x+','+precomputedCoords.pay.y+' 就是这家:'+precomputedCoords.thisHome.x+','+precomputedCoords.thisHome.y+' 确认无误:'+precomputedCoords.confirmWuWu.x+','+precomputedCoords.confirmWuWu.y,2);
}
function createFloatingWindow(){
	var _0x1b506f=device.width;
	var _0x2ed352=device.height;
	var _0xeecf97=Math.floor(_0x1b506f*0.28);
	var _0x528f46=_0xeecf97>200?'10sp':'8sp';
	var _0x4d54ab=_0xeecf97>200?'10sp':'8sp';
	var _0x292ae3=_0xeecf97>200?'8sp':'6sp';
	var _0x4899a7='<frame gravity="center" bg="#88000000" layout_height="wrap_content">\n      <vertical padding="2dp" layout_height="wrap_content">\n        <text id="status" text="'+scriptName+'" textColor="#ffffff" textSize="'+_0x528f46+'" gravity="center" margin="3dp" bg="#33ffffff" padding="8dp" clickable="true" />\n        <vertical id="mainContent" layout_height="wrap_content">\n          <button id="toggleBtn" text="▶ 开始运行" textSize="'+_0x4d54ab+'" margin="3dp" layout_height="44dp" bg="#4CAF50" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n          <button id="calibrateBtn" text="📦 订单设置" textSize="'+_0x4d54ab+'" margin="3dp" layout_height="44dp" bg="#2196F3" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n          <button id="configBtn" text="🔧 脚本设置" textSize="'+_0x4d54ab+'" margin="3dp" layout_height="44dp" bg="#FF9800" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n\n          <ScrollView id="calibrationPanel" bg="#dd000000" visibility="gone" margin="2dp" layout_height="wrap_content" maxHeight="300dp">\n            <vertical padding="4dp">\n              <text text="📦 订单设置" textColor="#ffffff" textSize="'+_0x292ae3+'" gravity="center" margin="2dp" bg="#33ffffff" padding="6dp" />\n              <text text="配送方式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="deliveryModeBtn" text="到店取" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#4CAF50" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="端盒:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="boxBtn" text="否" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="数量加2:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="add2Btn" text="否" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="极速+2(有概率点不到):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="fastAdd2Btn" text="否" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="连续+2(有概率卡死):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="loopAdd2Btn" text="否" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="到货通知:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="arrivalNotifyBtn" text="是" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#4CAF50" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <!-- 订单设置面板不再显示关闭按钮 -->\n            </vertical>\n          </ScrollView>\n\n          <ScrollView id="configPanel" bg="#dd000000" visibility="gone" margin="2dp" layout_height="wrap_content" maxHeight="350dp">\n            <vertical padding="4dp">\n              <text text="🔧 脚本设置" textColor="#ffffff" textSize="'+_0x292ae3+'" gravity="center" margin="2dp" bg="#33ffffff" padding="6dp" />\n              <text text="定位设置:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <button id="calibratePayBtn" text="X 确认信息" textSize="'+_0x292ae3+'" margin="2dp" layout_height="35dp" bg="#FF9800" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n              <button id="calibrateHomeBtn" text="X 就是这家" textSize="'+_0x292ae3+'" margin="2dp" layout_height="35dp" bg="#3F51B5" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n              <button id="calibrateWuWuBtn" text="X 确认无误" textSize="'+_0x292ae3+'" margin="2dp" layout_height="35dp" bg="#009688" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n              <text text="刷新等待时间(毫秒):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="refreshTimeBtn" text="500ms" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#2196F3" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="运行模式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="clickModeBtn" text="运行模式" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#9C27B0" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="回流极速模式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="reflowSpeedBtn" text="开启" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#4CAF50" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="确认信息等待(毫秒):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="payWaitBtn" text="100ms" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#FF5722" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="地址确认等待(毫秒):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="addressWaitBtn" text="300ms" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#FF9800" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="提交订单间隔(毫秒):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="confirmWaitBtn" text="100ms" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#795548" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="震动时间(毫秒):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="vibrateTimeBtn" text="20000ms" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n                <text text="抢购模式设置:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="before22RefreshMsBtn" text="0ms" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="防黑号模式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="antiBlackModeBtn" text="开启" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#4CAF50" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="自动停止时长(分钟，防黑号模式):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="pauseIntervalBtn" text="10分钟" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="自适应回流模式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="adaptiveReflowBtn" text="关闭" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="自适应回流开启时间(分钟):" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="adaptiveReflowTimeBtn" text="2.5分钟" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="回流-1模式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="reflowMinus1Btn" text="关闭" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="显示控制台:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="consoleSwitchBtn" text="关闭" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <text text="调试模式:" textColor="#ffffff" textSize="'+_0x292ae3+'" margin="2dp" />\n              <horizontal margin="2dp">\n                <button id="debugModeBtn" text="关闭" textSize="'+_0x292ae3+'" layout_height="30dp" bg="#607D8B" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" layout_weight="1" />\n              </horizontal>\n              <button id="exitBtn" text="� 退出脚本" textSize="'+_0x292ae3+'" margin="2dp" layout_height="35dp" bg="#9E9E9E" textColor="#ffffff" style="Widget.AppCompat.Button.Colored" />\n            </vertical>\n          </ScrollView>\n        </vertical>\n      </vertical>\n      <button id="dragBtn" text="" w="19" h="19" bg="#00FFFFFF" layout_gravity="left|bottom" style="Widget.AppCompat.Button.Borderless" />\n    </frame>';
	window=floaty.window(_0x4899a7);
	var _0x5a6c4f=false;
	var _0x321b6e=null;
	var _0xfa819b=null;
	function _0xe0c8b2(_0x71841){
		var _0xdc29d2=_0xfa819b||window.getHeight();
		var _0x41d142=Math.floor(_0xdc29d2/3);
		if(typeof _0x71841==='function')_0x71841(_0x41d142);
		return _0x41d142;
	}
	function _0x4d0a95(){
		if(!_0x5a6c4f){
			window.calibrationPanel.setVisibility(8);
			window.configPanel.setVisibility(8);
			isPanelOpen=false;
			isConfigPanelOpen=false;
			window.mainContent.setVisibility(8);
			_0xe0c8b2(function(_0x4c16d3){
				window.setSize(window.getWidth(),_0x4c16d3);
			});
			_0x5a6c4f=true;
		}else{
			window.mainContent.setVisibility(0);
			if(_0xfa819b){
				window.setSize(window.getWidth(),_0xfa819b);
			}else{
				window.setSize(window.getWidth(),windowBaseHeight);
			}
			_0x5a6c4f=false;
			stopScript();
		}
	}
	window.status.click(()=>{
		_0x4d0a95();
	});
	function _0x39955c(_0x1fde8a){
		setTimeout(function(){
			try{
				var _0x40f0f5={'statusHeight':0,'buttonHeight':0,'totalHeight':0};
				if(window.status&&window.status.getHeight){
					_0x40f0f5.statusHeight=window.status.getHeight();
				}else{
					_0x40f0f5.statusHeight=Math.floor(_0x2ed352*0.04);
				}
				if(window.toggleBtn&&window.toggleBtn.getHeight){
					_0x40f0f5.buttonHeight=window.toggleBtn.getHeight();
				}else{
					_0x40f0f5.buttonHeight=Math.floor(_0x2ed352*0.04);
				}
				if(window.getHeight){
					_0x40f0f5.totalHeight=window.getHeight();
				}else{
					_0x40f0f5.totalHeight=Math.floor(_0x2ed352*0.25);
				}
				_0x1fde8a(_0x40f0f5);
			}catch(_0x9c885c){
				console.log('测量UI元素失败:',_0x9c885c);
				_0x1fde8a({'statusHeight':Math.floor(_0x2ed352*0.04),'buttonHeight':Math.floor(_0x2ed352*0.04),'totalHeight':Math.floor(_0x2ed352*0.25)});
			}
		},100);
	}
	function _0x343d85(_0x5e738a){
		var _0x36dd15=_0x5e738a.statusHeight+20;
		var _0xd096bc=_0x5e738a.buttonHeight+10;
		var _0x3e2f2b=_0x40c814*_0xd096bc;
		var _0x4a6ec4=Math.floor(_0x2ed352*0.02);
		var _0x4cb7f7=Math.floor(_0x2ed352*0.02);
		var _0x4f9fdb=Math.floor(_0x2ed352*0.02);
		var _0x3927a0=_0x36dd15+_0x3e2f2b+_0x4a6ec4+_0x4cb7f7+_0x4f9fdb;
		_0x3927a0=Math.max(_0x3927a0,Math.floor(_0x2ed352*0.2));
		return _0x3927a0;
	}
	var _0x4af552,_0x27fad7,_0x4ce418,_0x319a56;
	ui.run(function(){
		try{
			window.dragBtn.setBackgroundDrawable(null);
			window.dragBtn.setPadding(0,0,0,0);
			window.dragBtn.setAlpha(0.7);
			window.dragBtn.setBackgroundColor(colors.parseColor('#CCEEEEEE'));
			window.dragBtn.setText('☰');
			window.dragBtn.setTextSize(10);
			window.dragBtn.setTextColor(colors.parseColor('#AA333333'));
		}catch(_0x5cd758){
			try{
				window.dragBtn.setText('⋮');
				window.dragBtn.setTextSize(8);
			}catch(_0x398b9e){}
		}
	});
	window.dragBtn.setOnTouchListener(function(_0x52ef73,_0x3aeec8){
		switch(_0x3aeec8.getAction()){
			case _0x3aeec8.ACTION_DOWN:
				_0x4af552=_0x3aeec8.getRawX();
				_0x27fad7=_0x3aeec8.getRawY();
				_0x4ce418=window.getX();
				_0x319a56=window.getY();
				try{
					_0x52ef73.setScaleX(0.92);
					_0x52ef73.setScaleY(0.92);
				}catch(_0x88a610){}
				return true;
			case _0x3aeec8.ACTION_MOVE:
				var _0x1ce3fb=_0x3aeec8.getRawX()-_0x4af552;
				var _0x2b9bd4=_0x3aeec8.getRawY()-_0x27fad7;
				window.setPosition(_0x4ce418+_0x1ce3fb,_0x319a56+_0x2b9bd4);
				return true;
			case _0x3aeec8.ACTION_UP:
				try{
					_0x52ef73.setScaleX(1);
					_0x52ef73.setScaleY(1);
				}catch(_0x335d4b){}
				config.windowX=window.getX();
				config.windowY=window.getY();
				saveConfig();
				console.log('悬浮窗位置已保存:',config.windowX,'x',config.windowY);
				return true;
		}
		return false;
	});
	window.before22RefreshMsBtn.click(()=>{
		var _0x2bd9fa=dialogs.rawInput('22点前提前多少毫秒刷新(0为关闭，注意此处需要花费约1s时间，请提前测试好网络时间和滑动时间(输入的时间为网络时间+滑动时间，每台设备不同各位老板自行测试)。这也是实验性功能(可能存在bug)，而且因为不可能精确计算时间。如果号的运气比较好，会自动跳转，通常不建议开启，运行脚本等在商品界面即可。)',before22RefreshMs+'');
		if(typeof _0x2bd9fa==='object'&&typeof _0x2bd9fa.then==='function'){
			_0x2bd9fa.then(function(_0x1996eb){
				if(_0x1996eb!=null){
					var _0x5b6849=parseInt(_0x1996eb);
					if(!isNaN(_0x5b6849)&&_0x5b6849>=0&&_0x5b6849<=60000){
						before22RefreshMs=_0x5b6849;
						updateConfigButtonTexts();
						toast('22点前提前刷新毫秒已设置为: '+_0x5b6849+'ms'+(_0x5b6849===0?'(关闭)':''));
					}else{
						toast('请输入0-60000之间的整数');
					}
				}
			});
		}else if(_0x2bd9fa!=null){
			var _0xd9e03=parseInt(_0x2bd9fa);
			if(!isNaN(_0xd9e03)&&_0xd9e03>=0&&_0xd9e03<=60000){
				before22RefreshMs=_0xd9e03;
				updateConfigButtonTexts();
				toast('22点前提前刷新毫秒已设置为: '+_0xd9e03+'ms'+(_0xd9e03===0?'(关闭)':''));
			}else{
				toast('请输入0-60000之间的整数');
			}
		}
	});
	window.consoleSwitchBtn.click(()=>{
		config.showConsole=!config.showConsole;
		if(config.showConsole&&config.debugMode===0){
			config.debugMode=1;
		}
		saveConfig();
		updateConfigButtonTexts();
		toast('控制台已'+(config.showConsole?'开启(仅重启脚本后生效)':'关闭(仅重启脚本后生效)'));
	});
	window.debugModeBtn.click(()=>{
		config.debugMode=(config.debugMode+1)%3;
		if(config.debugMode>0&&!config.showConsole){
			config.showConsole=true;
		}
		saveConfig();
		updateConfigButtonTexts();
		var _0x5a445c;
		if(config.debugMode===0){
			_0x5a445c='关闭';
		}else if(config.debugMode===1){
			_0x5a445c='精简';
		}else if(config.debugMode===2){
			_0x5a445c='完全';
		}
		toast('调试模式已设置为: '+_0x5a445c);
	});
	var _0x1b506f=device.width;
	var _0x2ed352=device.height;
	var _0xeecf97=Math.floor(_0x1b506f*0.28);
	var _0x40c814=3;
	var _0x25f261=44;
	var _0x5a79fe=3;
	var _0x45e6cf=Math.floor(_0x2ed352*0.04);
	var _0xd8c23a=Math.floor(_0x2ed352*0.04);
	var _0x22fb63=_0x40c814*_0xd8c23a;
	var _0x214a41=Math.floor(_0x2ed352*0.03);
	var _0x17e066=Math.floor(_0x2ed352*0.03);
	var _0x599c37=Math.floor(_0x2ed352*0.03);
	var _0x264747=_0x45e6cf+_0x22fb63+_0x214a41+_0x17e066+_0x599c37;
	_0x264747=Math.max(_0x264747,300);
	var _0x535236=Math.floor(_0x2ed352*0.15);
	var _0x5cc882=_0x264747+_0x535236;
	var _0xf9e62c=Math.max(_0x264747,Math.floor(_0x2ed352*0.25));
	var _0x2d3cd2=Math.max(_0x5cc882,Math.floor(_0x2ed352*0.45));
	_0xeecf97=Math.max(_0xeecf97,220);
	_0xf9e62c=Math.max(_0xf9e62c,Math.floor(_0x2ed352/4)+20);
	_0x2d3cd2=Math.max(_0x2d3cd2,Math.floor(_0x2ed352/2)+20);
	if(_0x2ed352<1000){
		_0xf9e62c=Math.min(_0xf9e62c,Math.floor(_0x2ed352*0.6));
		_0x2d3cd2=Math.min(_0x2d3cd2,Math.floor(_0x2ed352*0.85));
	}
	windowBaseHeight=_0xf9e62c;
	windowExtendedHeight=_0x2d3cd2;
	var _0x16e714,_0x45a5ca;
	var _0x445677=false;
	if(config.windowX!==null&&config.windowY!==null){
		var _0x5120e4=_0x1b506f-_0xeecf97;
		var _0x2758c1=_0x2ed352-_0xf9e62c;
		if(config.windowX>=0&&config.windowX<=_0x5120e4&&config.windowY>=0&&config.windowY<=_0x2758c1){
			_0x16e714=config.windowX;
			_0x45a5ca=config.windowY;
			console.log('使用保存的悬浮窗位置:',_0x16e714,'x',_0x45a5ca);
		}else{
			_0x445677=true;
			console.log('保存的位置超出边界 X:'+config.windowX+' Y:'+config.windowY+'，使用默认位置');
		}
	}else{
		_0x445677=true;
	}
	if(_0x445677){
		_0x16e714=_0x1b506f-_0xeecf97+Math.floor(_0x1b506f/1000);
		_0x45a5ca=Math.floor(_0x2ed352/10);
		if(_0x45a5ca<=0||_0x16e714<=0){
			_0x45a5ca=0;
			_0x16e714=100;
			console.log('默认位置过小，使用屏幕左上角(0,0)');
		}
		console.log('使用默认悬浮窗位置:',_0x16e714,'x',_0x45a5ca);
		config.windowX=_0x16e714;
		config.windowY=_0x45a5ca;
		saveConfig();
	}
	window.setPosition(_0x16e714,_0x45a5ca);
	window.setSize(_0xeecf97,_0xf9e62c);
	setTimeout(function(){
		_0x39955c(function(_0x366d67){
			var _0x5c877d=_0x343d85(_0x366d67);
			var _0x5ed41e=_0x5c877d+Math.floor(_0x2ed352*0.15);
			windowBaseHeight=Math.max(_0x5c877d,Math.floor(_0x2ed352/4)+20);
			windowExtendedHeight=Math.max(_0x5ed41e,Math.floor(_0x2ed352/2)+20);
			window.setSize(_0xeecf97,windowBaseHeight);
			_0xfa819b=windowBaseHeight;
			_0x321b6e=_0xe0c8b2();
			console.log('动态调整完成:');
			console.log('- 新基础高度:',windowBaseHeight,'px');
			console.log('- 新扩展高度:',windowExtendedHeight,'px');
		});
	},300);
	setTimeout(function(){
		optimizeWindowForScreen();
	},500);
	window.toggleBtn.click(()=>{
		if(!isRunning){
			if(!_0x5a6c4f){
				window.mainContent.setVisibility(8);
				_0xfa819b=window.getHeight();
				_0xe0c8b2(function(_0x32238c){
					window.setSize(window.getWidth(),_0x32238c);
				});
				_0x5a6c4f=true;
			}
			startScript();
		}else{
			stopScript();
		}
	});
	window.calibrateBtn.click(()=>{
		debugLog('用户点击定位按钮',2);
		if(window.calibrationPanel.getVisibility()==8){
			debugLog('显示定位面板',2);
			window.calibrationPanel.setVisibility(0);
			window.configPanel.setVisibility(8);
			isPanelOpen=true;
			isConfigPanelOpen=false;
			adjustWindowHeight('calibration');
		}else{
			debugLog('隐藏定位面板',2);
			window.calibrationPanel.setVisibility(8);
			isPanelOpen=false;
			adjustWindowHeight(false);
		}
	});
	window.configBtn.click(()=>{
		if(window.configPanel.getVisibility()==8){
			window.configPanel.setVisibility(0);
			window.calibrationPanel.setVisibility(8);
			isConfigPanelOpen=true;
			isPanelOpen=false;
			adjustWindowHeight('config');
		}else{
			window.configPanel.setVisibility(8);
			isConfigPanelOpen=false;
			adjustWindowHeight();
		}
	});
	window.calibratePayBtn.click(()=>{
		debugLog('开始定位\'确认信息并支付\'按钮',2);
		threads.start(()=>{
			calibrateButton('确认信息并支付','pay');
		});
	});
	window.calibrateHomeBtn.click(()=>{
		debugLog('开始定位\'就是这家\'按钮（到店取）',2);
		threads.start(()=>{
			calibrateButton(['就是这家'],'thisHome');
		});
	});
	window.calibrateWuWuBtn.click(()=>{
		debugLog('开始定位\'确认无误\'按钮（送到家）',2);
		threads.start(()=>{
			calibrateButton(['确认无误'],'confirmWuWu');
		});
	});
	window.deliveryModeBtn.click(()=>{
		config.deliveryMode=config.deliveryMode===0?1:0;
		saveConfig();
		updateConfigButtonTexts();
		toast('配送方式已切换为: '+(config.deliveryMode===0?'送到家':'到店取'));
	});
	window.refreshTimeBtn.click(()=>{
		var _0x595270=dialogs.rawInput('请输入刷新等待时间(毫秒)，这里代表的是刷新间隔，通常不建议太低，需要老板自行测试，太低了容易把确定刷走。',config.refreshTime+'');
		if(typeof _0x595270==='object'&&typeof _0x595270.then==='function'){
			_0x595270.then(function(_0x10f4af){
				if(_0x10f4af!=null){
					var _0x46a634=parseInt(_0x10f4af);
					if(!isNaN(_0x46a634)&&_0x46a634>0&&_0x46a634<=60000){
						if(_0x46a634<0){
							_0x46a634=0;
						}
						config.refreshTime=_0x46a634;
						saveConfig();
						updateConfigButtonTexts();
						toast('刷新等待时间已设置为: '+_0x46a634+'ms');
					}else{
						toast('请输入1-60000之间的整数');
					}
				}
			});
		}else if(_0x595270!=null){
			var _0x2a72eb=parseInt(_0x595270);
			if(!isNaN(_0x2a72eb)&&_0x2a72eb>0&&_0x2a72eb<=60000){
				if(_0x2a72eb<300){
					_0x2a72eb=300;
				}
				config.refreshTime=_0x2a72eb;
				saveConfig();
				updateConfigButtonTexts();
				toast('刷新等待时间已设置为: '+_0x2a72eb+'ms');
			}else{
				toast('请输入1-60000之间的整数');
			}
		}
	});
	window.clickModeBtn.click(()=>{
		config.clickMode=config.clickMode===0?1:0;
		saveConfig();
		updateConfigButtonTexts();
		toast('模式已切换为: '+(config.clickMode===0?'极速模式':'普通模式'));
	});
	window.payWaitBtn.click(()=>{
		var _0x11c8ee=dialogs.rawInput('请输入支付确认等待时间(毫秒)',config.payWait+'');
		if(typeof _0x11c8ee==='object'&&typeof _0x11c8ee.then==='function'){
			_0x11c8ee.then(function(_0x46343c){
				if(_0x46343c!=null){
					var _0x231b59=parseInt(_0x46343c);
					if(!isNaN(_0x231b59)&&_0x231b59>0&&_0x231b59<=10000){
						config.payWait=_0x231b59;
						saveConfig();
						updateConfigButtonTexts();
						toast('支付确认等待已设置为: '+_0x231b59+'ms');
					}else{
						toast('请输入1-10000之间的整数');
					}
				}
			});
		}else if(_0x11c8ee!=null){
			var _0x11ebcf=parseInt(_0x11c8ee);
			if(!isNaN(_0x11ebcf)&&_0x11ebcf>0&&_0x11ebcf<=10000){
				config.payWait=_0x11ebcf;
				saveConfig();
				updateConfigButtonTexts();
				toast('支付确认等待已设置为: '+_0x11ebcf+'ms');
			}else{
				toast('请输入1-10000之间的整数');
			}
		}
	});
	window.addressWaitBtn.click(()=>{
		var _0x5df045=dialogs.rawInput('请输入地址确认等待时间(毫秒)',config.addressWait+'');
		if(typeof _0x5df045==='object'&&typeof _0x5df045.then==='function'){
			_0x5df045.then(function(_0x5e4245){
				if(_0x5e4245!=null){
					var _0x1904a5=parseInt(_0x5e4245);
					if(!isNaN(_0x1904a5)&&_0x1904a5>0&&_0x1904a5<=10000){
						config.addressWait=_0x1904a5;
						saveConfig();
						updateConfigButtonTexts();
						toast('地址确认等待已设置为: '+_0x1904a5+'ms');
					}else{
						toast('请输入1-10000之间的整数');
					}
				}
			});
		}else if(_0x5df045!=null){
			var _0x3199b6=parseInt(_0x5df045);
			if(!isNaN(_0x3199b6)&&_0x3199b6>0&&_0x3199b6<=10000){
				config.addressWait=_0x3199b6;
				saveConfig();
				updateConfigButtonTexts();
				toast('地址确认等待已设置为: '+_0x3199b6+'ms');
			}else{
				toast('请输入1-10000之间的整数');
			}
		}
	});
	window.confirmWaitBtn.click(()=>{
		var _0x3bdf20=dialogs.rawInput('请输入订单间隔时间(毫秒，卡提交用)',config.confirmWait+'');
		if(typeof _0x3bdf20==='object'&&typeof _0x3bdf20.then==='function'){
			_0x3bdf20.then(function(_0x2046b3){
				if(_0x2046b3!=null){
					var _0x2c06fe=parseInt(_0x2046b3);
					if(!isNaN(_0x2c06fe)&&_0x2c06fe>0&&_0x2c06fe<=10000){
						config.confirmWait=_0x2c06fe;
						saveConfig();
						updateConfigButtonTexts();
						toast('确认按钮等待已设置为: '+_0x2c06fe+'ms');
					}else{
						toast('请输入1-10000之间的整数');
					}
				}
			});
		}else if(_0x3bdf20!=null){
			var _0x2b22ee=parseInt(_0x3bdf20);
			if(!isNaN(_0x2b22ee)&&_0x2b22ee>0&&_0x2b22ee<=10000){
				config.confirmWait=_0x2b22ee;
				saveConfig();
				updateConfigButtonTexts();
			}else{
				toast('请输入1-10000之间的整数');
			}
		}
	});
	window.vibrateTimeBtn.click(()=>{
		var _0x3a93ed=dialogs.rawInput('请输入震动时间(毫秒)',config.vibrateTime+'');
		if(typeof _0x3a93ed==='object'&&typeof _0x3a93ed.then==='function'){
			_0x3a93ed.then(function(_0x2166cb){
				if(_0x2166cb!=null){
					var _0x2c28f8=parseInt(_0x2166cb);
					if(!isNaN(_0x2c28f8)&&_0x2c28f8>0&&_0x2c28f8<=60000){
						config.vibrateTime=_0x2c28f8;
						saveConfig();
						updateConfigButtonTexts();
						toast('震动时间已设置为: '+_0x2c28f8+'ms');
					}else{
						toast('请输入1-60000之间的整数');
					}
				}
			});
		}else if(_0x3a93ed!=null){
			var _0x75ec4d=parseInt(_0x3a93ed);
			if(!isNaN(_0x75ec4d)&&_0x75ec4d>0&&_0x75ec4d<=60000){
				config.vibrateTime=_0x75ec4d;
				saveConfig();
				updateConfigButtonTexts();
				toast('震动时间已设置为: '+_0x75ec4d+'ms');
			}else{
				toast('请输入1-60000之间的整数');
			}
		}
	});
	window.antiBlackModeBtn.click(()=>{
		config.antiBlackMode=!config.antiBlackMode;
		saveConfig();
		updateConfigButtonTexts();
		toast('防黑号模式已'+(config.antiBlackMode?'开启':'关闭'));
	});
	window.pauseIntervalBtn.click(()=>{
		var _0x1db028=dialogs.rawInput('请输入自动停止时长(分钟)',config.pauseInterval+'');
		if(typeof _0x1db028==='object'&&typeof _0x1db028.then==='function'){
			_0x1db028.then(function(_0x2c1a75){
				if(_0x2c1a75!=null){
					var _0x2bbd37=parseInt(_0x2c1a75);
					if(!isNaN(_0x2bbd37)&&_0x2bbd37>0&&_0x2bbd37<=1440){
						config.pauseInterval=_0x2bbd37;
						saveConfig();
						updateConfigButtonTexts();
						toast('自动停止时长已设置为: '+_0x2bbd37+'分钟');
					}else{
						toast('请输入1-1440之间的整数');
					}
				}
			});
		}else if(_0x1db028!=null){
			var _0xe1842=parseInt(_0x1db028);
			if(!isNaN(_0xe1842)&&_0xe1842>0&&_0xe1842<=1440){
				config.pauseInterval=_0xe1842;
				saveConfig();
				updateConfigButtonTexts();
				toast('自动停止时长已设置为: '+_0xe1842+'分钟');
			}else{
				toast('请输入1-1440之间的整数');
			}
		}
	});
	window.adaptiveReflowBtn.click(()=>{
		config.adaptiveReflowMode=!config.adaptiveReflowMode;
		saveConfig();
		updateConfigButtonTexts();
		toast('自适应回流模式已'+(config.adaptiveReflowMode?'开启':'关闭'));
	});
	window.adaptiveReflowTimeBtn.click(()=>{
		var _0x1216af=dialogs.rawInput('请输入自适应回流开启时间(分钟)',config.adaptiveReflowTime+'');
		if(typeof _0x1216af==='object'&&typeof _0x1216af.then==='function'){
			_0x1216af.then(function(_0x20bf08){
				if(_0x20bf08!=null){
					var _0x4de625=parseFloat(_0x20bf08);
					if(!isNaN(_0x4de625)&&_0x4de625>0&&_0x4de625<=1440){
						config.adaptiveReflowTime=_0x4de625;
						saveConfig();
						updateConfigButtonTexts();
						toast('自适应回流开启时间已设置为: '+_0x4de625+'分钟');
					}else{
						toast('请输入0-1440之间的数字');
					}
				}
			});
		}else if(_0x1216af!=null){
			var _0x5ec050=parseFloat(_0x1216af);
			if(!isNaN(_0x5ec050)&&_0x5ec050>0&&_0x5ec050<=1440){
				config.adaptiveReflowTime=_0x5ec050;
				saveConfig();
				updateConfigButtonTexts();
				toast('自适应回流开启时间已设置为: '+_0x5ec050+'分钟');
			}else{
				toast('请输入0-1440之间的数字');
			}
		}
	});
	window.reflowMinus1Btn.click(()=>{
		config.reflowMinus1=!config.reflowMinus1;
		saveConfig();
		updateConfigButtonTexts();
		toast('回流-1模式已'+(config.reflowMinus1?'开启':'关闭'));
	});
	window.boxBtn.click(()=>{
		config.box=!config.box;
		saveConfig();
		updateConfigButtonTexts();
		toast('端盒已'+(config.box?'开启':'关闭'));
	});
	window.add2Btn.click(()=>{
		config.add2=!config.add2;
		saveConfig();
		updateConfigButtonTexts();
		toast('数量加2已'+(config.add2?'开启':'关闭'));
	});
	window.fastAdd2Btn.click(()=>{
		config.fastAdd2=!config.fastAdd2;
		saveConfig();
		updateConfigButtonTexts();
		toast('极速+2已'+(config.fastAdd2?'开启':'关闭'));
	});
	window.loopAdd2Btn.click(()=>{
		config.loopAdd2=!config.loopAdd2;
		saveConfig();
		updateConfigButtonTexts();
		toast('连续+2已'+(config.loopAdd2?'开启':'关闭'));
	});
	window.arrivalNotifyBtn.click(()=>{
		config.arrivalNotify=!config.arrivalNotify;
		saveConfig();
		updateConfigButtonTexts();
		toast('到货通知已'+(config.arrivalNotify?'开启':'关闭'));
	});
	window.reflowSpeedBtn.click(()=>{
		config.reflowSpeedMode=!config.reflowSpeedMode;
		saveConfig();
		updateConfigButtonTexts();
		toast('回流极速模式已'+(config.reflowSpeedMode?'开启':'关闭'));
	});
	window.exitBtn.click(()=>{
		if(isRunning){
			stopScript();
		}
		if(calibrationWindow){
			calibrationWindow.close();
		}
		window.close();
		exit();
	});
	updateCalibrationButtonTexts();
	updateConfigButtonTexts();
	updateConfigButtonTexts();
}
function startTimeMonitor(){
	if(!isAutoRestarting){
		scriptStartTime=Date.now();
	}else{
		scriptStartTime=savedScriptStartTime;
		isAutoRestarting=false;
	}
	sleep(200);
	timeMonitorThread=threads.start(function(){
		debugLog('时间监控流程启动',2);
		while(isRunning&&timeMonitorThread&&!timeMonitorThread.isInterrupted()){
			sleep(1000);
			if(!isRunning)break;
			var _0x362aa0=Date.now();
			var _0x37e6b0=_0x362aa0-scriptStartTime;
			if(config.antiBlackMode){
				var _0xca3171=config.pauseInterval*60*1000;
				if(_0x37e6b0>=_0xca3171){
					debugLog('防黑号模式：运行'+config.pauseInterval+'分钟，自动停止脚本',1);
					stopScript();
					break;
				}
				var _0x4fe71a=Math.max(0,_0xca3171-_0x37e6b0);
				var _0xbf544c=Math.floor(_0x4fe71a/60000);
				var _0x3d1518=Math.floor(_0x4fe71a%60000/1000);
				ui.run(()=>{
					if(window&&window.status){
						window.status.setText(scriptName+'\n运行中 '+_0xbf544c+':'+(_0x3d1518<10?'0':'')+_0x3d1518);
					}
				});
			}else{
				var _0x401057=Math.floor(_0x37e6b0/60000);
				var _0x403a28=Math.floor(_0x37e6b0%60000/1000);
				ui.run(()=>{
					if(window&&window.status){
						window.status.setText(scriptName+'\n '+_0x401057+':'+(_0x403a28<10?'0':'')+_0x403a28);
					}
				});
			}
		}
		debugLog('时间监控流程结束',2);
	});
}
function startAdaptiveReflowMonitor(){
	var _0x2a5080={'fcOfj':'1|0|2|5|4|3','Ivzfq':function(_0x55d3f5,_0x22e838){
		return _0x55d3f5>_0x22e838;
	},'HrxSM':function(_0x3cfe58){
		return _0x3cfe58();
	},'HOrGw':function(_0x32f88d,_0xa2b4af){
		return _0x32f88d(_0xa2b4af);
	},'ARbFn':function(_0x3c628b,_0x14c6b7){
		return _0x3c628b*_0x14c6b7;
	},'Iajdv':function(_0x2747ac,_0x2a113b){
		return _0x2747ac!==_0x2a113b;
	},'nQfCY':'tXsnw','yWoOj':'nUzND','zhyuJ':function(_0x38de34,_0x406e4c){
		return _0x38de34+_0x406e4c;
	},'uapKx':function(_0x100408,_0x34de2b){
		return _0x100408+_0x34de2b;
	},'WadCX':function(_0x173f9d,_0x4e5b92){
		return _0x173f9d+_0x4e5b92;
	},'FwjQX':function(_0x2db405,_0x8336f5){
		return _0x2db405+_0x8336f5;
	},'WiDpn':function(_0x3375e0,_0x3b1f5f){
		return _0x3375e0+_0x3b1f5f;
	},'eVTzo':'\n运行中 ','BIQyk':function(_0x34aace,_0x550cbd){
		return _0x34aace<_0x550cbd;
	},'vNaXn':'mjYVt','rmnGl':'DrzUg','IieUV':'\n运行中 自适应回流模式','NpxoT':function(_0xc6c4d4,_0x28f808,_0x189f6f){
		return _0xc6c4d4(_0x28f808,_0x189f6f);
	},'GKaNI':'自适应回流时间监控启动','bMgnb':function(_0x34996c,_0x2f6f6b){
		return _0x34996c&&_0x2f6f6b;
	},'XTsmF':function(_0x2514ff,_0x106f4e){
		return _0x2514ff-_0x106f4e;
	},'kgkEf':function(_0x2bda66,_0x34e5f1){
		return _0x2bda66*_0x34e5f1;
	},'Noory':function(_0x136553,_0x40f3de){
		return _0x136553-_0x40f3de;
	},'PprNS':function(_0x3d2880,_0x14e0e7){
		return _0x3d2880/_0x14e0e7;
	},'pHjhx':function(_0x1ea134,_0x2ce3b7){
		return _0x1ea134/_0x2ce3b7;
	},'LzxlS':function(_0x5049c3,_0x3d58fb){
		return _0x5049c3%_0x3d58fb;
	},'dpdWi':function(_0x24d942,_0x57d607){
		return _0x24d942>=_0x57d607;
	},'HaEeM':function(_0x3b6e98,_0x510547,_0x2fb5ef){
		return _0x3b6e98(_0x510547,_0x2fb5ef);
	},'CjMxW':'自适应回流模式时间到达，停止脚本运行','aGzbt':function(_0x214cdc){
		return _0x214cdc();
	},'OuMWK':'自适应回流时间监控结束'};
	if(!config.adaptiveReflowMode)return;
	if(timeMonitorThread&&timeMonitorThread.isAlive()){
		timeMonitorThread.interrupt();
		timeMonitorThread=null;
	}
	var _0xbe1c68=Date.now();
	timeMonitorThread=threads.start(function(){
		_0x2a5080.NpxoT(debugLog,_0x2a5080.GKaNI,2);
		while(_0x2a5080.bMgnb(isRunning,timeMonitorThread)&&!timeMonitorThread.isInterrupted()){
			_0x2a5080.HOrGw(sleep,1000);
			if(!isRunning)break;
			var _0x2e599c=Date.now();
			var _0x196371=_0x2a5080.XTsmF(_0x2e599c,_0xbe1c68);
			var _0x612478=_0x2a5080.ARbFn(_0x2a5080.kgkEf(config.adaptiveReflowTime,60),1000);
			var _0x16b3ec=Math.max(0,_0x2a5080.Noory(_0x612478,_0x196371));
			var _0x4fc3ba=Math.floor(_0x2a5080.PprNS(_0x16b3ec,60000));
			var _0x4946f7=Math.floor(_0x2a5080.pHjhx(_0x2a5080.LzxlS(_0x16b3ec,60000),1000));
			ui.run(()=>{
				var _0x3944fa={'zAWiA':_0x2a5080.fcOfj,'usCff':function(_0x2292a2,_0x11f8b1){
					return _0x2a5080.Ivzfq(_0x2292a2,_0x11f8b1);
				},'XEFjl':function(_0x1da005){
					return _0x2a5080.HrxSM(_0x1da005);
				},'wZnYk':function(_0x12da91,_0x2aae06){
					return _0x2a5080.HOrGw(_0x12da91,_0x2aae06);
				},'kPLBq':function(_0x540e82,_0x4454ee){
					return _0x2a5080.ARbFn(_0x540e82,_0x4454ee);
				}};
				if(_0x2a5080.Iajdv(_0x2a5080.nQfCY,_0x2a5080.yWoOj)){
					if(window&&window.status){
						if(_0x2a5080.Ivzfq(_0x16b3ec,0)){
							window.status.setText(_0x2a5080.zhyuJ(_0x2a5080.uapKx(_0x2a5080.WadCX(_0x2a5080.FwjQX(_0x2a5080.WiDpn(scriptName,_0x2a5080.eVTzo),_0x4fc3ba),':'),_0x2a5080.BIQyk(_0x4946f7,10)?'0':''),_0x4946f7));
						}else{
							if(_0x2a5080.Iajdv(_0x2a5080.vNaXn,_0x2a5080.rmnGl)){
								window.status.setText(_0x2a5080.WiDpn(scriptName,_0x2a5080.IieUV));
							}else{
								var _0x39c6b1=_0x3944fa.zAWiA.split('|'),_0x579d67=0;
								while(true){
									switch(_0x39c6b1[_0x579d67++]){
										case'0':
											var _0x311106=before22RefreshMs&&_0x3944fa.usCff(before22RefreshMs,0);
										case'1':
											var _0xd160ed={'APPGw':function(_0x47d1b9){
												return _0x3944fa.XEFjl(_0x47d1b9);
											}};
											continue;
										case'2':
											var _0x1170fb=null;
											continue;
										case'3':
											_0x3944fa.XEFjl(runMainScript);
											continue;
										case'4':
											_0x3944fa.XEFjl(startTimeMonitor);
											continue;
										case'5':
											if(_0x311106){
												_0x1170fb=threads.start(function(){
													_0xd160ed.APPGw(startBefore22RefreshMonitor);
												});
												while(before22RefreshThread&&before22RefreshThread.isAlive()){
													_0x3944fa.wZnYk(sleep,100);
												}
											}
											continue;
									}
									break;
								}
							}
						}
					}
				}else{
					newWidth=Math.floor(_0x3944fa.kPLBq(screenWidth,0.38));
				}
			});
			if(_0x2a5080.dpdWi(_0x196371,_0x612478)){
				_0x2a5080.HaEeM(debugLog,_0x2a5080.CjMxW,1);
				_0x2a5080.aGzbt(stopScript);
				break;
			}
		}
		_0x2a5080.HaEeM(debugLog,_0x2a5080.OuMWK,2);
	});
}
function stopTimeMonitor(){
	if(timeMonitorThread&&timeMonitorThread.isAlive()){
		debugLog('停止时间监控流程',2);
		timeMonitorThread.interrupt();
		timeMonitorThread=null;
	}
}
function startScript(){
	if(isRunning)return;
	isRunning=true;
	try{
		if(!isAutoRestarting){
			ui.run(()=>{
				window.status.setText(scriptName+'\n开始运行');
				window.toggleBtn.setText('⏸ 停止运行');
				window.toggleBtn.attr('bg','#f44336');
			});
			debugLog('用户点击开始按钮，脚本开始执行',2);
		}else{
			debugLog('自动重启：重新开始脚本执行',2);
		}
	}catch(_0x29d6ad){
		debugLog('开始脚本时发生错误: '+_0x29d6ad,2);
		toast('开始脚本时发生错误: '+_0x29d6ad);
		isRunning=false;
		ui.run(()=>{
			window.status.setText(scriptName);
			window.toggleBtn.setText('▶ 开始运行');
			window.toggleBtn.attr('bg','#4CAF50');
		});
	}
	mainThread=threads.start(function(){
		try{
			var _0x51769d=before22RefreshMs&&before22RefreshMs>0;
			var _0x2add8b=null;
			if(_0x51769d){
				_0x2add8b=threads.start(function(){
					startBefore22RefreshMonitor();
				});
				while(before22RefreshThread&&before22RefreshThread.isAlive()){
					sleep(100);
				}
			}
			startTimeMonitor();
			runMainScript();
		}catch(_0x4ae95f){
			debugLog('脚本执行出错: '+_0x4ae95f,2);
			if(!isAutoRestarting){
				isRunning=false;
				ui.run(()=>{
					window.status.setText(scriptName);
					window.toggleBtn.setText('▶ 开始运行');
					window.toggleBtn.attr('bg','#4CAF50');
				});
			}
		}
	});
}
function stopScript(){
	if(!isRunning)return;
	isRunning=false;
	if(!isAutoRestarting){
		ui.run(()=>{
			window.status.setText(scriptName);
			window.toggleBtn.setText('▶ 开始运行');
			window.toggleBtn.attr('bg','#4CAF50');
		});
		stopTimeMonitor();
	}
	debugLog('脚本停止执行',2);
	if(mainThread){
		mainThread.interrupt();
		mainThread=null;
	}
	debugLog('正在停止所有功能流程...',2);
	threads.shutDownAll();
}
function calibrateButton(_0x1c6aec,_0x1e9f48){
	debugLog('开始定位按钮: '+JSON.stringify(_0x1c6aec),2);
	try{
		var _0x58a015=null;
		var _0x24674a='';
		if(Array.isArray(_0x1c6aec)){
			for(var _0x334d79=0;_0x334d79<_0x1c6aec.length;_0x334d79++){
				_0x58a015=className('android.widget.TextView').text(_0x1c6aec[_0x334d79]).findOne(1000);
				if(_0x58a015){
					_0x24674a=_0x1c6aec[_0x334d79];
					break;
				}
			}
		}else{
			_0x58a015=className('android.widget.TextView').text(_0x1c6aec).findOne(3000);
			_0x24674a=_0x1c6aec;
		}
		if(_0x58a015){
			var _0x1a49bc=_0x58a015.bounds();
			if(_0x1e9f48==='pay'){
				pay_pos=[_0x1a49bc.left,_0x1a49bc.top,_0x1a49bc.right,_0x1a49bc.bottom];
				config.payPos=pay_pos;
				calibrationStatus.pay=true;
			}else if(_0x1e9f48==='thisHome'){
				thisHome_pos=[_0x1a49bc.left,_0x1a49bc.top,_0x1a49bc.right,_0x1a49bc.bottom];
				config.thisHomePos=thisHome_pos;
				calibrationStatus.thisHome=true;
			}else if(_0x1e9f48==='confirmWuWu'){
				confirmWuWu_pos=[_0x1a49bc.left,_0x1a49bc.top,_0x1a49bc.right,_0x1a49bc.bottom];
				config.confirmWuWuPos=confirmWuWu_pos;
				calibrationStatus.confirmWuWu=true;
			}
			config.calibrationStatus=calibrationStatus;
			updatePrecomputedCoords();
			saveConfig();
			debugLog('\''+_0x24674a+'\'按钮定位成功，坐标: '+JSON.stringify([_0x1a49bc.left,_0x1a49bc.top,_0x1a49bc.right,_0x1a49bc.bottom]),2);
			toast('\''+_0x24674a+'\'按钮定位成功');
			updateCalibrationButtonTexts();
		}else{
			var _0x4b3c96=Array.isArray(_0x1c6aec)?_0x1c6aec.join('\'或\''):_0x1c6aec;
			debugLog('未找到\''+_0x4b3c96+'\'按钮',2);
			toast('未找到\''+_0x4b3c96+'\'按钮，请确保在正确页面');
		}
	}catch(_0x28653e){
		debugLog('定位按钮时发生错误: '+_0x28653e,2);
		toast('定位失败: '+_0x28653e);
	}
}
function updateCalibrationButtonTexts(){
	try{
		var _0x1bcf86=window.getWidth();
		var _0x33415b=_0x1bcf86<220;
		if(_0x33415b){
			window.calibratePayBtn.setText((calibrationStatus.pay?'✅ ':'X ')+'支付');
			window.calibrateHomeBtn.setText((calibrationStatus.thisHome?'✅ ':'X ')+'这家');
			window.calibrateWuWuBtn.setText((calibrationStatus.confirmWuWu?'✅ ':'X ')+'无误');
		}else{
			window.calibratePayBtn.setText((calibrationStatus.pay?'✅ ':'X ')+'确认信息');
			window.calibrateHomeBtn.setText((calibrationStatus.thisHome?'✅ ':'X ')+'就是这家');
			window.calibrateWuWuBtn.setText((calibrationStatus.confirmWuWu?'✅ ':'X ')+'确认无误');
		}
	}catch(_0xdfa50c){
		debugLog('更新按钮文本时出错: '+_0xdfa50c);
	}
}
function updateConfigButtonTexts(){
	try{
		if(!window||!window.deliveryModeBtn)return;
		window.deliveryModeBtn.setText(config.deliveryMode===0?'送到家':'到店取');
		window.refreshTimeBtn.setText(config.refreshTime+'ms');
		if(window.before22RefreshMsBtn)window.before22RefreshMsBtn.setText((before22RefreshMs||0)+'ms');
		window.clickModeBtn.setText(config.clickMode===0?'极速模式':'普通模式');
		window.reflowSpeedBtn.setText(config.reflowSpeedMode?'开启':'关闭');
		window.reflowSpeedBtn.setBackgroundColor(config.reflowSpeedMode?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.payWaitBtn.setText(config.payWait+'ms');
		window.addressWaitBtn.setText(config.addressWait+'ms');
		window.confirmWaitBtn.setText(config.confirmWait+'ms');
		window.vibrateTimeBtn.setText(config.vibrateTime+'ms');
		window.antiBlackModeBtn.setText(config.antiBlackMode?'开启':'关闭');
		window.antiBlackModeBtn.setBackgroundColor(config.antiBlackMode?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.pauseIntervalBtn.setText(config.pauseInterval+'分钟');
		window.adaptiveReflowBtn.setText(config.adaptiveReflowMode?'开启':'关闭');
		window.adaptiveReflowBtn.setBackgroundColor(config.adaptiveReflowMode?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.adaptiveReflowTimeBtn.setText(config.adaptiveReflowTime+'分钟');
		window.reflowMinus1Btn.setText(config.reflowMinus1?'开启':'关闭');
		window.reflowMinus1Btn.setBackgroundColor(config.reflowMinus1?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.consoleSwitchBtn.setText(config.showConsole?'开启':'关闭');
		var _0x52d187;
		if(config.debugMode===0){
			_0x52d187='关闭';
		}else if(config.debugMode===1){
			_0x52d187='精简';
		}else if(config.debugMode===2){
			_0x52d187='完全';
		}else{
			_0x52d187='关闭';
		}
		window.debugModeBtn.setText(_0x52d187);
		window.boxBtn.setText(config.box?'是':'否');
		window.boxBtn.setBackgroundColor(config.box?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.add2Btn.setText(config.add2?'是':'否');
		window.add2Btn.setBackgroundColor(config.add2?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.fastAdd2Btn.setText(config.fastAdd2?'是':'否');
		window.fastAdd2Btn.setBackgroundColor(config.fastAdd2?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.loopAdd2Btn.setText(config.loopAdd2?'是':'否');
		window.loopAdd2Btn.setBackgroundColor(config.loopAdd2?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
		window.arrivalNotifyBtn.setText(config.arrivalNotify?'是':'否');
		window.arrivalNotifyBtn.setBackgroundColor(config.arrivalNotify?colors.parseColor('#4CAF50'):colors.parseColor('#607D8B'));
	}catch(_0x52371f){
		debugLog('更新配置按钮文本时出错: '+_0x52371f);
	}
}
function safeClick(_0x1111d0){
	var _0x25b371=_0x1111d0.findOne(100);
	if(_0x25b371){
		_0x25b371.click();
		return true;
	}
	return false;
}
function safeClickByBounds(_0x32774e,_0x295c00){
	var _0x39af8e=_0x32774e.bounds(_0x295c00[0],_0x295c00[1],_0x295c00[2],_0x295c00[3]).findOne(500);
	if(_0x39af8e){
		_0x39af8e.click();
		return true;
	}
	return false;
}
function safeClickByText(_0x222437,_0x407a0d){
	var _0xb64220=_0x222437.text(_0x407a0d).findOne(500);
	if(_0xb64220){
		_0xb64220.click();
		return true;
	}
	return false;
}
function adjustWindowHeight(_0x5d1421){
	if(!window)return;
	try{
		var _0x2f85f4=device.height;
		var _0x4cc3cb;
		if(_0x5d1421==='calibration'){
			var _0x5f5a1c=40;
			var _0x357f84=4*44;
			var _0x4c985e=4*6+24;
			var _0x3f14ea=_0x5f5a1c+_0x357f84+_0x4c985e;
			var _0xdcd0b3=40;
			var _0x5e4bed=4*40;
			var _0x12ce8d=4*4;
			var _0x365b0c=8;
			var _0x3b6c86=4;
			var _0x114a3d=_0xdcd0b3+_0x5e4bed+_0x12ce8d+_0x365b0c+_0x3b6c86+20;
			var _0x569c57=_0x3f14ea+_0x114a3d;
			var _0x594741=Math.floor(_0x2f85f4*0.8);
			_0x4cc3cb=Math.min(_0x569c57,_0x594741);
			_0x4cc3cb=Math.max(_0x4cc3cb,Math.floor(_0x2f85f4*0.8));
		}else if(_0x5d1421==='config'){
			var _0x5f5a1c=40;
			var _0x357f84=4*44;
			var _0x4c985e=4*6+24;
			var _0x3f14ea=_0x5f5a1c+_0x357f84+_0x4c985e;
			var _0x51f393=35;
			var _0x39f9c8=9*25;
			var _0x6de9e9=9*30;
			var _0x25a132=35;
			var _0x11ce79=20*4+30;
			var _0x340d37=_0x51f393+_0x39f9c8+_0x6de9e9+_0x25a132+_0x11ce79;
			var _0x569c57=_0x3f14ea+_0x340d37;
			var _0x594741=Math.floor(_0x2f85f4*0.75);
			_0x4cc3cb=Math.min(_0x569c57,_0x594741);
			_0x4cc3cb=Math.max(_0x4cc3cb,Math.floor(_0x2f85f4*0.6));
		}else{
			_0x4cc3cb=windowBaseHeight;
		}
		window.setSize(window.getWidth(),_0x4cc3cb);
		var _0xb4fc5c=window.getY();
		var _0xd39d1e=_0xb4fc5c;
		var _0x8d382b=_0xb4fc5c+_0x4cc3cb;
		if(_0xd39d1e<20){
			var _0x46f337=20;
			window.setPosition(window.getX(),_0x46f337);
		}else if(_0x8d382b>_0x2f85f4-20){
			var _0x46f337=Math.max(20,_0x2f85f4-_0x4cc3cb-20);
			window.setPosition(window.getX(),_0x46f337);
		}
	}catch(_0x1f6311){
		console.error('调整窗口高度时出错:',_0x1f6311);
	}
}
function optimizeWindowForScreen(){
	if(!window)return;
	try{
		var _0x168959=device.width;
		var _0x565685=device.height;
		var _0xa5db7e=_0x168959/1080;
		var _0x100a6f=_0x168959<720||_0x565685<1280;
		var _0xdd40d;
		if(_0x100a6f){
			_0xdd40d=Math.floor(_0x168959*0.38);
		}else{
			_0xdd40d=Math.floor(_0x168959*0.3);
		}
		_0xdd40d=Math.max(_0xdd40d,220);
		var _0x5e3285;
		if(isPanelOpen){
			_0x5e3285=windowExtendedHeight;
		}else if(isConfigPanelOpen){
			_0x5e3285=Math.floor(_0x565685*0.65);
		}else{
			_0x5e3285=windowBaseHeight;
		}
		window.setSize(_0xdd40d,_0x5e3285);
		var _0x230462=Math.floor(_0x168959*0.28);
		var _0x30a6b1=_0x168959-_0x230462+Math.floor(_0x168959/100);
		_0x30a6b1=window.getX();
		if(isPanelOpen||isConfigPanelOpen){
			window.setPosition(_0x30a6b1,window.getY());
		}else{
			var _0x91b6f8=Math.min(window.getY(),_0x565685-_0x5e3285-50);
			window.setPosition(_0x30a6b1,Math.max(50,_0x91b6f8));
		}
		updateCalibrationButtonTexts();
	}catch(_0x23e8e2){
		console.error('优化窗口时出错:',_0x23e8e2);
	}
}
if(config.showConsole){
	try{
		console.show();
	}catch(_0x1824ca){}
}else{
	try{
		console.hide();
	}catch(_0x5f5d18){}
}
device.keepScreenOn();
function padStart(_0x2173d7,_0x59266d,_0x270856){
	_0x2173d7=_0x2173d7.toString();
	while(_0x2173d7.length<_0x59266d){
		_0x2173d7=_0x270856+_0x2173d7;
	}
	return _0x2173d7;
}
function debugLog(_0x2723d3,_0x98db4d){
	_0x98db4d=_0x98db4d||1;
	if(config.debugMode>=_0x98db4d){
		console.log(_0x2723d3);
	}
}
var buy_it,queding,know;
function safeClickAdd2Button(){
	debugLog('尝试通过UI结构特征定位 \'+2\' 按钮',3);
	try{
		var _0x3160d9=[25,24,26,23,27,22,28];
		for(var _0x3233a5=0;_0x3233a5<_0x3160d9.length;_0x3233a5++){
			var _0x365ebc=_0x3160d9[_0x3233a5];
			debugLog('尝试深度 '+_0x365ebc,3);
			var _0x4ca420=className('android.widget.TextView').text('数量').depth(_0x365ebc).find();
			if(_0x4ca420&&_0x4ca420.length>0){
				debugLog('在深度'+_0x365ebc+'找到'+_0x4ca420.length+'个\'数量\'控件',3);
				var _0x3a150b=className('android.widget.Image').depth(_0x365ebc).find();
				if(_0x3a150b&&_0x3a150b.length>0){
					debugLog('在深度'+_0x365ebc+'找到'+_0x3a150b.length+'个Image控件',3);
					var _0x3dff22=_0x3a150b.length-1;
					var _0x3c03f9=_0x3a150b[_0x3dff22];
					var _0x225ce5=_0x3a150b[_0x3dff22-1];
					if(_0x3c03f9&&typeof _0x3c03f9.bounds==='function'){
						if(_0x3dff22>=2){
							var _0xf11ddd=_0x3a150b[_0x3dff22-1];
							var _0x114110=className('android.widget.TextView').depth(_0x365ebc).find();
							var _0x5915af=false;
							for(var _0x41cc3b=0;_0x41cc3b<_0x114110.length;_0x41cc3b++){
								var _0x4694ce=_0x114110[_0x41cc3b];
								if(_0x4694ce&&typeof _0x4694ce.text==='function'){
									var _0x23034a=_0x4694ce.text();
									if(_0x23034a&&/^[1-9]$/.test(_0x23034a)){
										debugLog('找到数量显示控件，文本: \''+_0x23034a+'\'',3);
										_0x5915af=true;
										break;
									}
								}
							}
							if(_0x5915af){
								var _0x42eba4=_0x3c03f9.bounds();
								debugLog('找到\'+2\'按钮！深度='+_0x365ebc+', 位置=最后一个Image控件',3);
								debugLog('控件bounds: '+_0x42eba4,3);
								debugLog('控件详细信息: left='+_0x42eba4.left+', top='+_0x42eba4.top+', right='+_0x42eba4.right+', bottom='+_0x42eba4.bottom,3);
								return[_0x3c03f9,_0x225ce5];
							}else{
								debugLog('UI结构验证失败：未找到数量显示控件',3);
							}
						}else{
							debugLog('Image控件数量不足，无法验证UI结构',3);
						}
					}else{
						debugLog('最后一个Image控件无效',3);
					}
				}else{
					debugLog('在深度'+_0x365ebc+'未找到Image控件',3);
				}
			}else{
				debugLog('在深度'+_0x365ebc+'未找到\'数量\'控件',3);
			}
		}
	}catch(_0x54e47c){
		debugLog('定位 \'+2\' 按钮时出错: '+_0x54e47c,1);
	}
	debugLog('未能找到 \'+2\' 按钮',1);
	return null;
}
var before22RefreshThread=null;
function startBefore22RefreshMonitor(){
	if(before22RefreshThread&&before22RefreshThread.isAlive()){
		before22RefreshThread.interrupt();
		before22RefreshThread=null;
	}
	if(!before22RefreshMs||before22RefreshMs<=0)return;
	before22RefreshThread=threads.start(function(){
		debugLog('[提前刷新] 监控线程启动，提前毫秒: '+before22RefreshMs,1);
		while(isRunning&&!threads.currentThread().isInterrupted()){
			var _0x50bab4=new Date();
			var _0x40e23b=new Date(_0x50bab4.getFullYear(),_0x50bab4.getMonth(),_0x50bab4.getDate(),22,0,0,0);
			var _0x490a09=_0x40e23b.getTime()-_0x50bab4.getTime()-before22RefreshMs;
			if(_0x490a09<=0){
				var _0x1673a5=device.width/2;
				var _0x3af266=device.height/3;
				var _0x386d7d=device.height*2/3;
				debugLog('[提前刷新] 到达目标时间，执行下滑 swipe('+_0x1673a5+', '+_0x3af266+', '+_0x1673a5+', '+_0x386d7d+', 200)',1);
				swipe(_0x1673a5,_0x3af266,_0x1673a5,_0x386d7d,1000);
				toast('已提前刷新（下滑）');
				before22RefreshMs=0;
				ui.run(function(){
					updateConfigButtonTexts();
				});
				break;
			}
			if(_0x490a09>60000){
				sleep(10000);
			}else if(_0x490a09>5000){
				sleep(1000);
			}else if(_0x490a09>1000){
				sleep(200);
			}else{
				sleep(1);
			}
		}
		debugLog('[提前刷新] 监控线程结束',1);
	});
}
function runMainScript(){
	debugLog('等待页面加载完成...',2);
	sleep(50);
	if(className('android.widget.TextView').text('确定').exists()==true){
		debugLog('已找到库存，跳过刷新',1);
		debugLog('点击\'确定\'按钮',1);
		safeClickByText(className('android.widget.TextView'),'确定');
		debugLog('等待支付页面加载...',2);
		sleep(100);
	}else{
		if(className('android.widget.TextView').text('立即购买').exists()==true){
			safeClickByText(className('android.widget.TextView'),'立即购买');
			sleep(200);
		}else{
			sleep(200);
		}
		var _0x212050=null;
		var _0x1eff76=null;
		var _0x35b06b=null;
		var _0x47a8d2=null;
		var _0xe47691=null;
		_0x212050=threads.start(function(){
			for(var _0x2232dc=0;_0x2232dc<20;_0x2232dc++){
				if(!isRunning)break;
				debugLog('配送方式 - 第'+(_0x2232dc+1)+'次执行',2);
				if(config.deliveryMode==0){
					debugLog('选择送到家',2);
					if(className('android.widget.TextView').text('送到家').exists()==true){
						debugLog('点击\'送到家\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'送到家');
						break;
					}else{
						debugLog('未找到\'送到家\'选项',2);
					}
				}else if(config.deliveryMode==1){
					debugLog('选择到店取',2);
					if(className('android.widget.TextView').text('到店取').exists()==true){
						debugLog('点击\'到店取\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'到店取');
						break;
					}else{
						debugLog('未找到\'到店取\'选项',2);
					}
				}
				sleep(500);
			}
			debugLog('配送方式完成',2);
		});
		if(config.box){
			_0x1eff76=threads.start(function(){
				for(var _0xfad9f3=0;_0xfad9f3<5;_0xfad9f3++){
					if(!isRunning)break;
					debugLog('端盒流程 - 第'+(_0xfad9f3+1)+'次执行',2);
					if(className('android.widget.TextView').text('整盒含6个盲盒').exists()==true){
						debugLog('点击\'整盒含6个盲盒\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'整盒含6个盲盒');
						sleep(50);
						break;
					}else if(className('android.widget.TextView').text('整盒含12个盲盒').exists()==true){
						debugLog('点击\'整盒含12个盲盒\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'整盒含12个盲盒');
						sleep(50);
						break;
					}else if(className('android.widget.TextView').text('整盒含9个盲盒').exists()==true){
						debugLog('点击\'整盒含9个盲盒\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'整盒含9个盲盒');
						sleep(50);
						break;
					}else if(className('android.widget.TextView').text('整盒含8个盲盒').exists()==true){
						debugLog('点击\'整盒含8个盲盒\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'整盒含8个盲盒');
						sleep(50);
						break;
					}else if(className('android.widget.TextView').text('整盒含5个盲盒').exists()==true){
						debugLog('点击\'整盒含5个盲盒\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'整盒含5个盲盒');
						sleep(50);
						break;
					}else if(className('android.widget.TextView').text('整盒含10个盲盒').exists()==true){
						debugLog('点击\'整盒含10个盲盒\'按钮',1);
						safeClickByText(className('android.widget.TextView'),'整盒含10个盲盒');
						sleep(50);
						break;
					}else{
						debugLog('未找到\'端盒\'按钮',2);
					}
					sleep(500);
				}
				debugLog('端盒完成',2);
			});
		}
		var _0x39e279=null;
		var _0x2d6867=null;
		if(config.add2){
			_0x35b06b=threads.start(function(){
				var _0x1f7c09=0;
				while(isRunning){
					if(_0x39e279){
						if(config.loopAdd2){
							_0x39e279.click();
							sleep(50);
						}else{
							debugLog('定位到数量加2按钮',1);
							break;
						}
					}else{
						var _0x50d944=safeClickAdd2Button();
						if(_0x50d944){
							_0x39e279=_0x50d944[0];
							_0x2d6867=_0x50d944[1];
							debugLog('成功定位到数量加2按钮',1);
						}else{
							_0x1f7c09++;
							debugLog('未能定位到数量加2按钮',1);
							if(_0x1f7c09>20){
								debugLog('数量加2流程 - 已尝试20次，退出循环',1);
								break;
							}
						}
					}
					sleep(200);
				}
			});
		}
		_0x47a8d2=threads.start(function(){
			if(!config.arrivalNotify){
				debugLog('到货通知已关闭，跳过到货通知流程',1);
				return;
			}
			for(var _0x533310=0;_0x533310<20;_0x533310++){
				if(!isRunning)break;
				debugLog('到货通知流程 - 第'+(_0x533310+1)+'次执行',2);
				if(className('android.widget.TextView').text('到货通知').exists()==true){
					debugLog('点击\'到货通知\'按钮',1);
					safeClickByText(className('android.widget.TextView'),'到货通知');
					sleep(50);
				}else if(className('android.widget.TextView').text('已设置提醒').exists()==true){
					debugLog('到货通知已开启，无需再次点击',1);
					break;
				}else{
					debugLog('未找到到货通知按钮',2);
				}
				sleep(200);
			}
			debugLog('到货通知功能完成',2);
		});
		var _0x1ddf46=null;
		var _0x2a89af=false;
		var _0x8fc067=Date.now();
		debugLog('启动库存刷新',2);
		debugLog('未找到库存，开始刷新',1);
		_0x1ddf46=threads.start(function(){
			var _0xf7c83d={'hpOmD':function(_0x28fdd1,_0x43bd32){
				return _0x28fdd1(_0x43bd32);
			},'aTwjy':'请输入1-10000之间的整数'};
			var _0x53aad3=null;
			var _0x50ebdc=Date.now()+config.refreshTime;
			while(isRunning&&!_0x2a89af){
				if(!_0x53aad3){
					if(className('android.widget.TextView').text('立即购买').exists()==true){
						_0x53aad3=className('android.widget.TextView').text('立即购买').findOne(1000);
					}else{
						debugLog('未找到立即购买按钮,再探',2);
						sleep(100);
					}
				}
				if(className('android.widget.TextView').text('确定').exists()==true){
					break;
				}
				debugLog('刷新库存',1);
				_0x53aad3.click();
				waitTime(_0x50ebdc);
				var _0x3b852c=Math.floor(Math.random()*100);
				_0x50ebdc=Date.now()+config.refreshTime+_0x3b852c;
			}
			debugLog('刷新结束',2);
		});
		var _0x222623=null;
		while(isRunning&&!_0x2a89af){
			_0x222623=className('android.widget.TextView').text('确定').findOne();
			if(_0x222623){
				debugLog('发现补货提示！',1);
				if(_0x1ddf46&&_0x1ddf46.isAlive()){
					debugLog('停止刷新',2);
					_0x1ddf46.interrupt();
				}
				_0x2a89af=true;
				if(_0x39e279&&!config.loopAdd2){
					if(config.fastAdd2==true){
						debugLog('快速点击数量加2按钮',1);
						press(_0x39e279.bounds().centerX(),_0x39e279.bounds().centerY(),20);
						sleep(10);
					}else{
						debugLog('点击数量加2按钮',1);
						_0x39e279.click();
						sleep(10);
					}
				}
				debugLog('点击\'确定\'按钮',1);
				press(_0x222623.bounds().centerX(),_0x222623.bounds().centerY(),20);
				_0x47a8d2.interrupt();
				if(_0x35b06b){
					debugLog('停止数量加2',2);
					_0x35b06b.interrupt();
				}
				debugLog('等待支付页面加载...',2);
				sleep(100);
			}else{
				debugLog('未找到库存，继续刷新',2);
			}
			sleep(50);
		}
	}
	if(!isRunning)return;
	paymentStartFlag=true;
	var _0x98d880=0;
	let _0x5a30d8=true;
	var _0x46c2c4=Date.now()+1000;
	function _0x5eefae(){
		var _0x3db014={'nDpIF':function(_0x4fd19c,_0x26ac34){
			return _0x4fd19c(_0x26ac34);
		},'YBVzY':function(_0x5e5cd4){
			return _0x5e5cd4();
		},'ADrdU':function(_0x2b7ee3,_0xd1e3fc){
			return _0x2b7ee3(_0xd1e3fc);
		},'bpEYw':function(_0x1f6399,_0x3c778c){
			return _0x1f6399+_0x3c778c;
		},'Wsjlt':'22点前提前刷新毫秒已设置为: ','AEDZa':function(_0x272e21,_0x5ed423){
			return _0x272e21===_0x5ed423;
		},'uDgYK':'(关闭)','krZhl':'默认位置过小，使用屏幕左上角(0,0)','IchPv':'config','rmaIc':function(_0x485aa6,_0x55d5eb,_0x2e4960){
			return _0x485aa6(_0x55d5eb,_0x2e4960);
		},'iKdIp':'配置已保存','kNUrY':function(_0x2a646e,_0x20d4f8,_0xee4edd){
			return _0x2a646e(_0x20d4f8,_0xee4edd);
		},'FhSIJ':'Image控件数量不足，无法验证UI结构','NNFrB':'停止刷新'};
		debugLog('支付流程启动',2);
		var _0x547458=0;
		var _0x5e1b77=0;
		while(isRunning&&paymentThread&&!paymentThread.isInterrupted()){
			debugLog('查找\'确认信息并支付\'按钮',2);
			if(config.clickMode==0&&calibrationStatus.pay&&calibrationStatus.thisHome&&calibrationStatus.confirmWuWu){
				debugLog('极速模式，即将点击确认信息支付按钮，等待'+config.payWait+'毫秒',1);
				sleep(config.payWait-100);
				press(precomputedCoords.pay.x,precomputedCoords.pay.y,20);
				debugLog('点击确认信息支付，等待'+config.payWait+'毫秒',1);
				sleep(config.addressWait);
				_0x46c2c4=Date.now()+config.payWait;
				if(config.deliveryMode==1&&calibrationStatus.thisHome){
					debugLog('点击就是这家按钮',1);
					press(precomputedCoords.thisHome.x,precomputedCoords.thisHome.y,20);
				}else if(config.deliveryMode==0&&calibrationStatus.confirmWuWu){
					debugLog('点击确认无误按钮',1);
					press(precomputedCoords.confirmWuWu.x,precomputedCoords.confirmWuWu.y,20);
				}
				_0x5a30d8=false;
				_0x5bab6b=0;
				if(!config.reflowSpeedMode){
					sleep(500);
					debugLog('点击\'我知道了\'按钮',1);
					safeClickByText(className('android.widget.TextView'),'我知道了');
					sleep(2000);
					break;
				}
			}else{
				if(className('android.widget.TextView').text('确认信息并支付').exists()==true){
					debugLog('点击\'确认信息并支付\'按钮',1);
					if(calibrationStatus.pay){
						safeClickByBounds(className('android.widget.TextView'),pay_pos);
					}else{
						safeClickByText(className('android.widget.TextView'),'确认信息并支付');
					}
				}else{
					debugLog('未找到\'确认信息并支付\'按钮',2);
				}
				sleep(config.addressWait);
				if(config.deliveryMode==1){
					debugLog('查找\'就是这家\'按钮',2);
					if(className('android.widget.TextView').text('就是这家').exists()==true){
						debugLog('点击\'就是这家\'按钮',1);
						className('android.widget.TextView').text('就是这家').findOne().click();
					}else{
						debugLog('未找到\'就是这家\'按钮',2);
					}
				}else if(config.deliveryMode==0){
					debugLog('查找\'确认无误\'按钮',2);
					if(className('android.widget.TextView').text('确认无误').exists()==true){
						debugLog('点击\'确认无误\'按钮',1);
						className('android.widget.TextView').text('确认无误').findOne().click();
					}else{
						debugLog('未找到\'确认无误\'按钮',2);
					}
				}
			}
			debugLog('点击后等待'+config.confirmWait+'毫秒',1);
			sleep(config.confirmWait+100);
			while(className('android.widget.TextView').text('确认订单').exists()==true){
				debugLog('二次确认：查找\'确认信息并支付\'按钮',1);
				if(className('android.widget.TextView').text('确认信息并支付').exists()==true){
					if(calibrationStatus.pay){
						safeClickByText(className('android.widget.TextView'),'确认信息并支付');
					}else{
						safeClickByText(className('android.widget.TextView'),'确认信息并支付');
					}
				}else{
					debugLog('二次确认：未找到\'确认信息并支付\'按钮',1);
					if(_0x5e1b77<2){
						_0x5e1b77++;
						debugLog('二次确认：未找到\'确认信息并支付\'按钮，等待200毫秒后重试',2);
						sleep(200);
					}else{
						debugLog('二次确认：连续未找到\'确认信息并支付\'按钮，跳过后续操作',1);
						break;
					}
				}
				sleep(400);
				debugLog('二次确认：查找\'就是这家\'/\'确认无误\'按钮',1);
				if(config.deliveryMode==1){
					if(className('android.widget.TextView').text('就是这家').exists()==true){
						debugLog('二次确认：点击\'就是这家\'按钮',1);
						if(calibrationStatus.thisHome){
							safeClickByText(className('android.widget.TextView'),'就是这家');
						}else{
							safeClickByText(className('android.widget.TextView'),'就是这家');
						}
					}else{
						debugLog('二次确认：未找到\'就是这家\'按钮',1);
						if(_0x547458<2){
							_0x547458++;
							debugLog('二次确认：未找到\'就是这家\'按钮，等待500毫秒后重试',2);
							continue;
						}else{
							debugLog('二次确认：连续未找到\'就是这家\'按钮，跳过后续操作',1);
							break;
						}
					}
				}else if(config.deliveryMode==0){
					if(className('android.widget.TextView').text('确认无误').exists()==true){
						debugLog('二次确认：点击\'确认无误\'按钮',1);
						if(calibrationStatus.confirmWuWu){
							safeClickByText(className('android.widget.TextView'),'确认无误');
						}else{
							safeClickByText(className('android.widget.TextView'),'确认无误');
						}
					}else{
						debugLog('二次确认：未找到\'就是这家\'或\'确认无误\'按钮',2);
					}
				}
				sleep(config.confirmWait);
			}
			sleep(50);
		}
		debugLog('支付流程结束',2);
	}
	var _0x269631=0;
	var _0x22d1cf=null;
	var _0x5bab6b=0;
	debugLog('开始支付流程主循环',2);
	paymentThread=threads.start(_0x5eefae);
	startAdaptiveReflowMonitor();
	var _0x24b103=Date.now()+30000;
	var _0x42747d=false;
	var _0x19a739=0;
	while(isRunning){
		var _0xdd23cc=false;
		if(_0x22d1cf==null){
			_0x22d1cf=className('android.widget.TextView').text('确定').findOne();
		}
		if(Date.now()>_0x46c2c4){
			debugLog('门店防误触检测',2);
			if(className('android.widget.TextView').text('自提门店列表').exists()){
				debugLog('门店防误触启动',2);
				back();
				_0xdd23cc=true;
				_0x98d880=0;
			}
			_0x46c2c4=Date.now()+2000;
		}
		if(!className('android.widget.TextView').text('确认订单').exists()){
			debugLog('未检测到订单再探',2);
			if(paymentThread&&paymentThread.isAlive()){
				debugLog('未找到确认订单并支付控件，关闭支付流程',2);
				paymentThread.interrupt();
				paymentThread=null;
				_0x269631=0;
			}
			if(config.reflowMinus1&&_0x42747d==false){
				var _0x58d87c=Date.now();
				if(_0x58d87c>_0x24b103){
					debugLog('回流：尝试点击减1按钮',2);
					if(_0x2d6867!=null){
						_0x2d6867.click();
						console.log(_0x2d6867.bounds());
					}
					_0x19a739++;
					if(_0x19a739>=3){
						_0x42747d=true;
					}
				}
			}
		}else{
			if(!paymentThread||!paymentThread.isAlive()){
				debugLog('启动支付流程',2);
				paymentThread=threads.start(_0x5eefae);
			}
			sleep(100);
			continue;
		}
		if(_0x22d1cf&&className('android.widget.TextView').text('确定').exists()){
			debugLog('发现确定按钮，点击处理',1);
			if(_0x5bab6b>=1){
				debugLog('防卡死启动！',1);
				press(_0x22d1cf.bounds().centerX(),_0x22d1cf.bounds().centerY(),50);
			}else{
				_0x22d1cf.click();
				_0x5bab6b++;
			}
			sleep(100);
			_0x98d880=0;
			if(!paymentThread||!paymentThread.isAlive()){
				debugLog('启动支付流程',1);
				paymentThread=threads.start(_0x5eefae);
			}else{
				debugLog('重启支付流程',1);
				paymentThread.interrupt();
				paymentThread=threads.start(_0x5eefae);
			}
			sleep(250);
			continue;
		}else{
			debugLog('未找到确定按钮',2);
		}
		if(className('android.widget.TextView').text('确认订单').exists()&&(!paymentThread||!paymentThread.isAlive())){
			debugLog('发现确认订单并支付控件，启动支付流程',2);
			paymentThread=threads.start(_0x5eefae);
			_0x98d880=0;
			continue;
		}
		if(className('android.widget.TextView').text('确认信息并支付').exists()||className('android.widget.TextView').text('就是这家').exists()||className('android.widget.TextView').text('确认无误').exists()){
			_0xdd23cc=true;
			_0x98d880=0;
		}
		if(!_0xdd23cc){
			_0x98d880++;
			debugLog('未找到可操作按钮，计数: '+_0x98d880+'/5',2);
			if(_0x98d880>=5){
				debugLog('连续5次未找到可操作按钮，购买流程结束',1);
				break;
			}
		}
		sleep(100);
	}
	if(paymentThread&&paymentThread.isAlive()){
		debugLog('主循环结束，关闭支付流程',2);
		paymentThread.interrupt();
	}
	if(className('android.widget.TextView').text('已售罄').exists()){
		debugLog('发现已售罄提示，停止脚本',1);
		isRunning=false;
		stopTimeMonitor();
	}
	if(isRunning){
		debugLog('购买流程完成，开始震动提醒，震动时长：'+config.vibrateTime+'毫秒',2);
		device.vibrate(config.vibrateTime);
	}
	isRunning=false;
	stopTimeMonitor();
	if(!isAutoRestarting){
		ui.run(()=>{
			window.status.setText(scriptName);
			window.toggleBtn.setText('▶ 开始运行');
			window.toggleBtn.attr('bg','#4CAF50');
		});
	}
}
key="hmp_572ada9353e3d0edd29b469fc15148d9fed90f869e6248a9d15339257fff8f90";
if(launchCount>=3&&type_ivbiad!='object'){
	dialogs.alert(String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(39118)+String.fromCharCode(38505)+String.fromCharCode(35686)+String.fromCharCode(21578),String.fromCharCode(22914)+String.fromCharCode(38750)+String.fromCharCode(22312)+String.fromCharCode(72)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(105)+String.fromCharCode(98)+String.fromCharCode(111)+String.fromCharCode(116)+String.fromCharCode(23448)+String.fromCharCode(26041)+String.fromCharCode(24179)+String.fromCharCode(21488)+String.fromCharCode(36141)+String.fromCharCode(20080)+String.fromCharCode(65292)+String.fromCharCode(22343)+String.fromCharCode(20026)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(26377)+String.fromCharCode(36130)+String.fromCharCode(20135)+String.fromCharCode(25439)+String.fromCharCode(22833)+String.fromCharCode(39118)+String.fromCharCode(38505)+String.fromCharCode(65281)+String.fromCharCode(10)+String.fromCharCode(35831)+String.fromCharCode(35748)+String.fromCharCode(20934)+String.fromCharCode(72)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(105)+String.fromCharCode(98)+String.fromCharCode(111)+String.fromCharCode(116)+String.fromCharCode(23448)+String.fromCharCode(26041)+String.fromCharCode(28192)+String.fromCharCode(36947)+String.fromCharCode(36141)+String.fromCharCode(20080)+String.fromCharCode(27491)+String.fromCharCode(29256)+String.fromCharCode(33050)+String.fromCharCode(26412)+String.fromCharCode(12290)+String.fromCharCode(10)+String.fromCharCode(10)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(33050)+String.fromCharCode(26412)+String.fromCharCode(21487)+String.fromCharCode(33021)+String.fromCharCode(23548)+String.fromCharCode(33268)+String.fromCharCode(36134)+String.fromCharCode(21495)+String.fromCharCode(34987)+String.fromCharCode(23553)+String.fromCharCode(12289)+String.fromCharCode(36130)+String.fromCharCode(20135)+String.fromCharCode(25439)+String.fromCharCode(22833)+String.fromCharCode(12289)+String.fromCharCode(20010)+String.fromCharCode(20154)+String.fromCharCode(20449)+String.fromCharCode(24687)+String.fromCharCode(27844)+String.fromCharCode(38706)+String.fromCharCode(31561)+String.fromCharCode(20005)+String.fromCharCode(37325)+String.fromCharCode(21518)+String.fromCharCode(26524)+String.fromCharCode(12290)+String.fromCharCode(10)+String.fromCharCode(10)+String.fromCharCode(22914)+String.fromCharCode(26377)+String.fromCharCode(30097)+String.fromCharCode(38382)+String.fromCharCode(35831)+String.fromCharCode(32852)+String.fromCharCode(31995)+String.fromCharCode(20316)+String.fromCharCode(32773)+String.fromCharCode(25110)+String.fromCharCode(72)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(105)+String.fromCharCode(98)+String.fromCharCode(111)+String.fromCharCode(116)+String.fromCharCode(23448)+String.fromCharCode(26041)+String.fromCharCode(12290));
}
fbasildas=key;
if(fbasildas==null||fbasildas==undefined||fbasildas==''){
	dialogs.alert(String.fromCharCode(35831)+String.fromCharCode(20808)+String.fromCharCode(30331)+String.fromCharCode(24405)+String.fromCharCode(72)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(105)+String.fromCharCode(98)+String.fromCharCode(111)+String.fromCharCode(116)+String.fromCharCode(36134)+String.fromCharCode(21495)+String.fromCharCode(21518)+String.fromCharCode(20877)+String.fromCharCode(36816)+String.fromCharCode(34892)+String.fromCharCode(33050)+String.fromCharCode(26412)+String.fromCharCode(12290));
}
debugLog('启动悬浮窗控制面板',2);
createFloatingWindow();
debugLog('当前定位状态:',2);
debugLog('确认信息并支付: '+(calibrationStatus.pay?'已定位':'未定位'),2);
debugLog('就是这家: '+(calibrationStatus.thisHome?'已定位':'未定位'),2);
debugLog('确认无误: '+(calibrationStatus.confirmWuWu?'已定位':'未定位'),2);
debugLog('脚本启动完成',2);
if(autoRunEnabled){
	debugLog('自动运行已开启，正在启动脚本',2);
	isRunning=true;
	try{
		if(!isAutoRestarting){
			ui.run(()=>{
				window.status.setText(scriptName+'\n开始运行');
				window.toggleBtn.setText('⏸ 停止运行');
				window.toggleBtn.attr('bg','#f44336');
			});
			debugLog('用户点击开始按钮，脚本开始执行',2);
		}else{
			debugLog('自动重启：重新开始脚本执行',2);
		}
	}catch(_0x93b9a7){
		debugLog('开始脚本时发生错误: '+_0x93b9a7,2);
		toast('开始脚本时发生错误: '+_0x93b9a7);
		isRunning=false;
		ui.run(()=>{
			window.status.setText(scriptName);
			window.toggleBtn.setText('▶ 开始运行');
			window.toggleBtn.attr('bg','#4CAF50');
		});
	}
	mainThread=threads.start(function(){
		try{
			startTimeMonitor();
			runMainScript();
		}catch(_0x79ae70){
			debugLog('脚本执行出错: '+_0x79ae70,2);
			if(!isAutoRestarting){
				isRunning=false;
				ui.run(()=>{
					window.status.setText(scriptName);
					window.toggleBtn.setText('▶ 开始运行');
					window.toggleBtn.attr('bg','#4CAF50');
				});
			}
		}
	});
}
if(fbasildas==null||fbasildas==undefined||fbasildas==''){
	exit();
}
var LAUNCH_COUNT_KEY='launchCount';
var launchCountRaw=configStorage.get(LAUNCH_COUNT_KEY);
var launchCount=0;
if(typeof launchCountRaw==='number'){
	launchCount=launchCountRaw;
}else if(typeof launchCountRaw==='string'&&!isNaN(parseInt(launchCountRaw))){
	launchCount=parseInt(launchCountRaw);
}
launchCount=Number(launchCount)+1;
configStorage.put(LAUNCH_COUNT_KEY,launchCount);
setInterval(function(){},60000);
function timeValidation(){
	var _0x4d5918=ivbiad.env.TIMESTAMP;
	try{
		if(typeof _0x4d5918==='string'){
			var _0x52d0e2=_0x4d5918.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
			if(!_0x52d0e2)throw'错误';
			var _0x29eb03=parseInt(_0x52d0e2[1],10);
			var _0x1e52a5=parseInt(_0x52d0e2[2],10)-1;
			var _0x479080=parseInt(_0x52d0e2[3],10);
			var _0x18ca15=parseInt(_0x52d0e2[4],10);
			var _0x447c06=parseInt(_0x52d0e2[5],10);
			var _0x3516e5=parseInt(_0x52d0e2[6],10);
			var _0x431de8=new Date(_0x29eb03,_0x1e52a5,_0x479080,_0x18ca15,_0x447c06,_0x3516e5);
			var _0xe37fb3=Math.abs(Date.now()-_0x431de8.getTime());
			if(_0xe37fb3>24*60*60*1000){
				dialogs.alert(String.fromCharCode(35831)+String.fromCharCode(26816)+String.fromCharCode(26597)+String.fromCharCode(26159)+String.fromCharCode(21542)+String.fromCharCode(20351)+String.fromCharCode(29992)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(38750)+String.fromCharCode(104)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(105)+String.fromCharCode(98)+String.fromCharCode(111)+String.fromCharCode(116)+String.fromCharCode(24179)+String.fromCharCode(21488)+String.fromCharCode(30340)+String.fromCharCode(33050)+String.fromCharCode(26412)+String.fromCharCode(22343)+String.fromCharCode(20026)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(27809)+String.fromCharCode(26377)+String.fromCharCode(24179)+String.fromCharCode(21488)+String.fromCharCode(30417)+String.fromCharCode(31649)+String.fromCharCode(65292)+String.fromCharCode(33509)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(20154)+String.fromCharCode(21592)+String.fromCharCode(20351)+String.fromCharCode(29992)+String.fromCharCode(21518)+String.fromCharCode(38376)+String.fromCharCode(24456)+String.fromCharCode(23481)+String.fromCharCode(26131)+String.fromCharCode(23548)+String.fromCharCode(33268)+String.fromCharCode(36130)+String.fromCharCode(20135)+String.fromCharCode(25439)+String.fromCharCode(22833)+String.fromCharCode(65292)+String.fromCharCode(25152)+String.fromCharCode(23548)+String.fromCharCode(33268)+String.fromCharCode(30340)+String.fromCharCode(19968)+String.fromCharCode(20999)+String.fromCharCode(38382)+String.fromCharCode(39064)+String.fromCharCode(27010)+String.fromCharCode(19981)+String.fromCharCode(36127)+String.fromCharCode(36131)+String.fromCharCode(12290)+String.fromCharCode(33509)+String.fromCharCode(20351)+String.fromCharCode(29992)+String.fromCharCode(20026)+String.fromCharCode(27491)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(35831)+String.fromCharCode(25552)+String.fromCharCode(20132)+String.fromCharCode(24037)+String.fromCharCode(21333)+String.fromCharCode(12290));
				console.log('定时启动！');
			}
		}else{
			dialogs.alert(String.fromCharCode(35831)+String.fromCharCode(26816)+String.fromCharCode(26597)+String.fromCharCode(26159)+String.fromCharCode(21542)+String.fromCharCode(20351)+String.fromCharCode(29992)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(38750)+String.fromCharCode(104)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(105)+String.fromCharCode(98)+String.fromCharCode(111)+String.fromCharCode(116)+String.fromCharCode(24179)+String.fromCharCode(21488)+String.fromCharCode(30340)+String.fromCharCode(33050)+String.fromCharCode(26412)+String.fromCharCode(22343)+String.fromCharCode(20026)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(27809)+String.fromCharCode(26377)+String.fromCharCode(24179)+String.fromCharCode(21488)+String.fromCharCode(30417)+String.fromCharCode(31649)+String.fromCharCode(65292)+String.fromCharCode(33509)+String.fromCharCode(30423)+String.fromCharCode(29256)+String.fromCharCode(20154)+String.fromCharCode(21592)+String.fromCharCode(20351)+String.fromCharCode(29992)+String.fromCharCode(21518)+String.fromCharCode(38376)+String.fromCharCode(24456)+String.fromCharCode(23481)+String.fromCharCode(26131)+String.fromCharCode(23548)+String.fromCharCode(33268)+String.fromCharCode(36130)+String.fromCharCode(20135)+String.fromCharCode(25439)+String.fromCharCode(22833)+String.fromCharCode(65292)+String.fromCharCode(25152)+String.fromCharCode(23548)+String.fromCharCode(33268)+String.fromCharCode(30340)+String.fromCharCode(19968)+String.fromCharCode(20999)+String.fromCharCode(38382)+String.fromCharCode(39064)+String.fromCharCode(27010)+String.fromCharCode(19981)+String.fromCharCode(36127)+String.fromCharCode(36131)+String.fromCharCode(12290)+String.fromCharCode(33509)+String.fromCharCode(20351)+String.fromCharCode(29992)+String.fromCharCode(20026)+String.fromCharCode(27491)+String.fromCharCode(29256)+String.fromCharCode(65292)+String.fromCharCode(35831)+String.fromCharCode(25552)+String.fromCharCode(20132)+String.fromCharCode(24037)+String.fromCharCode(21333)+String.fromCharCode(12290));
		}
	}catch(_0x481b3e){
		toast('定时启动异常: '+_0x481b3e);
		exit();
	}
}
events.on('exit',function(){
	debugLog('脚本退出',2);
	if(window){
		window.close();
	}
});