package com.example.vpnself.script

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.example.vpnself.R

class FloatingWindowService : Service() {
    
    companion object {
        private const val TAG = "FloatingWindowService"
    }
    
    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var isShowing = false
    private var layoutParams: WindowManager.LayoutParams? = null
    
    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var captureButton: Button
    private lateinit var apiCountText: TextView
    private lateinit var coordinateInfoText: TextView
    private lateinit var listJsButton: Button
    private lateinit var statsButton: Button
    private lateinit var clearJsButton: Button
    private lateinit var checkDaodiequButton: Button
    private lateinit var aggressiveClickButton: Button
    private lateinit var httpInjectButton: Button
    
    // 拖动相关变量
    private var initialX: Int = 0
    private var initialY: Int = 0
    private var initialTouchX: Float = 0f
    private var initialTouchY: Float = 0f
    
    private val apiReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                "com.example.vpnself.API_CAPTURED" -> {
                    updateApiCount()
                }
                "com.example.vpnself.PURCHASE_API_LEARNED" -> {
                    updateStatus()
                    Toast.makeText(this@FloatingWindowService, "已学习购买接口！", Toast.LENGTH_SHORT).show()
                }
                "com.example.vpnself.BUTTON_COORDINATE_CAPTURED" -> {
                    updateButtonCoordinate(intent)
                }
                "com.example.vpnself.BUTTON_AUTO_CLICKED" -> {
                    updateAutoClickInfo(intent)
                }
                "com.example.vpnself.CHECK_FLOATING_WINDOW" -> {
                    // 响应检查请求，表示悬浮窗正在运行
                    Log.d(TAG, "悬浮窗状态检查：运行中")
                }
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        
        // 检查悬浮窗权限
        if (!Settings.canDrawOverlays(this)) {
            Log.e(TAG, "悬浮窗权限未授予")
            Toast.makeText(this, "请先授予悬浮窗权限", Toast.LENGTH_LONG).show()
            stopSelf()
            return
        }
        
        // 确保NetworkMonitor实例存在
        try {
            val networkMonitor = NetworkMonitorManager.getInstance(this)
            networkMonitor.addLog(
                NetworkMonitor.LogLevel.INFO,
                "🎮 悬浮窗服务已启动",
                "启动时间: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}\n" +
                "服务状态: ${ServiceHelper.getServiceStatusDescription(this)}"
            )
        } catch (e: Exception) {
            Log.w(TAG, "无法添加悬浮窗启动日志: ${e.message}")
        }
        
        createFloatingWindow()
        
        // 注册广播接收器
        val filter = IntentFilter().apply {
            addAction("com.example.vpnself.API_CAPTURED")
            addAction("com.example.vpnself.PURCHASE_API_LEARNED")
            addAction("com.example.vpnself.BUTTON_COORDINATE_CAPTURED")
            addAction("com.example.vpnself.BUTTON_AUTO_CLICKED")
            addAction("com.example.vpnself.CHECK_FLOATING_WINDOW")
        }
        registerReceiver(apiReceiver, filter)
        
        Log.d(TAG, "悬浮窗服务已创建")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        removeFloatingWindow()
        unregisterReceiver(apiReceiver)
        Log.d(TAG, "悬浮窗服务已销毁")
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createFloatingWindow() {
        try {
            // 创建悬浮窗布局
            floatingView = LayoutInflater.from(this).inflate(R.layout.floating_window, null)
            
            // 初始化控件
            initViews()
            
            // 设置悬浮窗参数
            layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 100
                y = 100
            }
            
            // 设置拖动功能
            setupDragFunctionality()
            
            // 添加到窗口管理器
            windowManager?.addView(floatingView, layoutParams)
            isShowing = true
            
            // 更新状态
            updateStatus()
            
        } catch (e: Exception) {
            Log.e(TAG, "创建悬浮窗失败: ${e.message}")
            Toast.makeText(this, "创建悬浮窗失败，请检查悬浮窗权限", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun initViews() {
        floatingView?.let { view ->
            statusText = view.findViewById(R.id.tv_status)
            startButton = view.findViewById(R.id.btn_start)
            stopButton = view.findViewById(R.id.btn_stop)
            captureButton = view.findViewById(R.id.btn_capture)
            apiCountText = view.findViewById(R.id.tv_api_count)
            coordinateInfoText = view.findViewById(R.id.tv_coordinate_info)
            listJsButton = view.findViewById(R.id.btn_list_js)
            statsButton = view.findViewById(R.id.btn_stats)
            clearJsButton = view.findViewById(R.id.btn_clear_js)
            checkDaodiequButton = view.findViewById(R.id.btn_check_daodiequ)
            aggressiveClickButton = view.findViewById(R.id.btn_aggressive_click)
            httpInjectButton = view.findViewById(R.id.btn_http_inject)
            
            // 设置点击事件
            captureButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service?.isCapturingActive() == true) {
                    service.stopCapture()
                    // 清空坐标显示
                    clearCoordinateInfo()
                } else {
                    service?.startCapture()
                }
                updateStatus()
            }
            
            startButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.startScript()
                    updateStatus()
                    Toast.makeText(this@FloatingWindowService, "🚀 开始抢购脚本", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            stopButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                service?.stopScript()
                service?.stopCapture()
                service?.clearCapturedCoordinates()
                // 清空坐标显示
                clearCoordinateInfo()
                updateStatus()
            }
            
            // JS文件和统计管理按钮点击事件
            listJsButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.logSavedJavaScriptFiles()
                    Toast.makeText(this@FloatingWindowService, "JS文件列表已输出到日志", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            statsButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.logAutoClickStats()
                    Toast.makeText(this@FloatingWindowService, "点击统计已输出到日志", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            clearJsButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.clearSavedJavaScriptFiles()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            checkDaodiequButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.checkDaodiequButtonStatus()
                    Toast.makeText(this@FloatingWindowService, "🔍 正在检查到店取按钮状态...", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            aggressiveClickButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.performAggressiveClickOnDaodiequButton()
                    Toast.makeText(this@FloatingWindowService, "🚀 正在执行激进点击...", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            httpInjectButton.setOnClickListener {
                val service = AutoBuyAccessibilityService.instance
                if (service != null) {
                    service.manualInjectButtonClickScript()
                    Toast.makeText(this@FloatingWindowService, "🚀 正在注入HTTP层面按钮点击脚本...", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this@FloatingWindowService, "⚠️ 无障碍服务未启动\n请到设置中启用「VPNSelf」无障碍服务", Toast.LENGTH_LONG).show()
                }
            }
            
            // 为按钮设置空的触摸监听器，阻止拖动事件传递
            val buttonTouchListener = View.OnTouchListener { _, _ -> false }
            captureButton.setOnTouchListener(buttonTouchListener)
            startButton.setOnTouchListener(buttonTouchListener)
            stopButton.setOnTouchListener(buttonTouchListener)
            listJsButton.setOnTouchListener(buttonTouchListener)
            statsButton.setOnTouchListener(buttonTouchListener)
            clearJsButton.setOnTouchListener(buttonTouchListener)
            checkDaodiequButton.setOnTouchListener(buttonTouchListener)
            aggressiveClickButton.setOnTouchListener(buttonTouchListener)
            httpInjectButton.setOnTouchListener(buttonTouchListener)
            
            // 最小化按钮
            val minimizeButton = view.findViewById<Button>(R.id.btn_minimize)
            minimizeButton.setOnClickListener {
                minimizeWindow()
            }
            minimizeButton.setOnTouchListener(buttonTouchListener)
            
            // 关闭按钮
            val closeButton = view.findViewById<Button>(R.id.btn_close)
            closeButton.setOnClickListener {
                AutoBuyAccessibilityService.instance?.stopAll()
                AutoBuyAccessibilityService.instance?.clearCapturedCoordinates()
                stopSelf()
            }
            closeButton.setOnTouchListener(buttonTouchListener)
        }
    }
    
    private fun updateStatus() {
        val service = AutoBuyAccessibilityService.instance
        if (service != null) {
            val status = service.getScriptStatus()
            statusText.text = "状态: $status"
            
            // 更新按钮状态和颜色
            updateButtonStates(service)
            updateApiCount()
        } else {
            statusText.text = "状态: ⚠️ 无障碍服务未启动"
            apiCountText.text = "点击修复服务"
            
            // 禁用所有按钮
            captureButton.isEnabled = false
            startButton.isEnabled = false
            stopButton.isEnabled = false
            listJsButton.isEnabled = false
            statsButton.isEnabled = false
            clearJsButton.isEnabled = false
            checkDaodiequButton.isEnabled = false
            aggressiveClickButton.isEnabled = false
            httpInjectButton.isEnabled = false
            
            // 添加点击修复功能
            apiCountText.setOnClickListener {
                ServiceHelper.tryFixServices(this@FloatingWindowService)
            }
        }
    }
    
    private fun updateButtonStates(service: AutoBuyAccessibilityService) {
        val isCapturing = service.isCapturingActive()
        val isRunning = service.isScriptRunning()
        val hasLearnedApi = service.hasLearnedPurchaseApi()
        
        // 更新抓包按钮
        captureButton.text = if (isCapturing) "停止抓包" else "开始抓包"
        captureButton.setBackgroundResource(
            if (isCapturing) R.drawable.btn_stop else R.drawable.btn_capture
        )
        captureButton.isEnabled = true
        
        // 更新开始按钮 - 移除学习API的前置条件，允许直接开始抢购
        startButton.isEnabled = !isRunning
        startButton.setBackgroundResource(
            if (isRunning) R.drawable.btn_stop else R.drawable.btn_start
        )
        
        // 更新停止按钮  
        stopButton.isEnabled = isRunning || isCapturing
        
        // 更新检查到店取按钮（始终启用）
        checkDaodiequButton.isEnabled = true
        
        // 更新激进点击按钮（始终启用）
        aggressiveClickButton.isEnabled = true
        
        // 更新HTTP注入按钮（始终启用）
        httpInjectButton.isEnabled = true
        
        // 更新API状态显示
        val apiStatus = if (hasLearnedApi) " ✓" else ""
        updateApiCount()
        apiCountText.text = "${apiCountText.text}$apiStatus"
    }
    
    private fun updateApiCount() {
        val service = AutoBuyAccessibilityService.instance
        val count = service?.getCapturedApis()?.size ?: 0
        apiCountText.text = "API: $count"
    }
    
    private fun updateButtonCoordinate(intent: Intent) {
        val buttonText = intent.getStringExtra("button_text") ?: "未知"
        val centerX = intent.getIntExtra("center_x", 0)
        val centerY = intent.getIntExtra("center_y", 0)
        val left = intent.getIntExtra("left", 0)
        val top = intent.getIntExtra("top", 0)
        val right = intent.getIntExtra("right", 0)
        val bottom = intent.getIntExtra("bottom", 0)
        
        // 更新坐标显示
        coordinateInfoText.text = "📍「$buttonText」\n坐标: ($centerX, $centerY)\n区域: ($left, $top, $right, $bottom)"
        coordinateInfoText.visibility = View.VISIBLE
        
        Log.d(TAG, "悬浮窗更新按钮坐标: $buttonText -> ($centerX, $centerY)")
    }
    
    private fun updateAutoClickInfo(intent: Intent) {
        val buttonText = intent.getStringExtra("button_text") ?: "未知"
        val centerX = intent.getIntExtra("center_x", 0)
        val centerY = intent.getIntExtra("center_y", 0)
        val clickTime = intent.getLongExtra("click_time", System.currentTimeMillis())
        val clickCount = intent.getIntExtra("click_count", 0)
        val totalClicks = intent.getIntExtra("total_clicks", 0)
        
        // 格式化时间
        val timeFormat = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
        val timeString = timeFormat.format(java.util.Date(clickTime))
        
        // 更新显示为自动点击信息
        coordinateInfoText.text = "🎯 已自动点击\n「$buttonText」\n坐标: ($centerX, $centerY)\n时间: $timeString\n本按钮: ${clickCount}次 | 总计: ${totalClicks}次"
        coordinateInfoText.visibility = View.VISIBLE
        
        // 改变文字颜色以区分自动点击和坐标捕获
        coordinateInfoText.setTextColor(android.graphics.Color.parseColor("#FF4CAF50")) // 绿色表示自动点击
        
        Log.d(TAG, "悬浮窗更新自动点击: $buttonText -> ($centerX, $centerY) at $timeString, 第${clickCount}次")
        
        // 5秒后恢复原色（延长显示时间以便查看统计）
        coordinateInfoText.postDelayed({
            coordinateInfoText.setTextColor(android.graphics.Color.parseColor("#FFFF9800")) // 恢复原橙色
        }, 5000)
    }
    
    private fun clearCoordinateInfo() {
        coordinateInfoText.visibility = View.GONE
        coordinateInfoText.text = "坐标: 未捕获"
        coordinateInfoText.setTextColor(android.graphics.Color.parseColor("#FFFF9800")) // 恢复原橙色
        Log.d(TAG, "已清空坐标信息显示")
    }
    
    private fun minimizeWindow() {
        // 最小化悬浮窗（缩小显示）
        floatingView?.let { view ->
            val miniView = view.findViewById<View>(R.id.mini_layout)
            val fullView = view.findViewById<View>(R.id.full_layout)
            
            if (miniView.visibility == View.GONE) {
                miniView.visibility = View.VISIBLE
                fullView.visibility = View.GONE
            } else {
                miniView.visibility = View.GONE
                fullView.visibility = View.VISIBLE
            }
        }
    }
    
    private fun setupDragFunctionality() {
        floatingView?.let { view ->
            // 创建触摸监听器
            val touchListener = View.OnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        // 记录初始位置
                        initialX = layoutParams?.x ?: 0
                        initialY = layoutParams?.y ?: 0
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        Log.d(TAG, "拖动开始: 初始位置($initialX, $initialY), 触摸位置(${initialTouchX}, ${initialTouchY})")
                        true
                    }
                    
                    MotionEvent.ACTION_MOVE -> {
                        // 计算移动偏移量
                        val deltaX = (event.rawX - initialTouchX).toInt()
                        val deltaY = (event.rawY - initialTouchY).toInt()
                        
                        // 更新悬浮窗位置
                        layoutParams?.let { params ->
                            params.x = initialX + deltaX
                            params.y = initialY + deltaY
                            
                            // 限制悬浮窗不超出屏幕边界
                            limitWindowBounds(params)
                            
                            try {
                                windowManager?.updateViewLayout(floatingView, params)
                            } catch (e: Exception) {
                                Log.e(TAG, "更新悬浮窗位置失败: ${e.message}")
                            }
                        }
                        true
                    }
                    
                    MotionEvent.ACTION_UP -> {
                        // 拖动结束，检查是否为点击事件
                        val deltaX = Math.abs(event.rawX - initialTouchX)
                        val deltaY = Math.abs(event.rawY - initialTouchY)
                        
                        Log.d(TAG, "拖动结束: 移动距离($deltaX, $deltaY)")
                        
                        // 如果移动距离很小，认为是点击事件，处理最小化窗口逻辑
                        if (deltaX < 10 && deltaY < 10) {
                            val miniView = view.findViewById<LinearLayout>(R.id.mini_layout)
                            if (miniView.visibility == View.VISIBLE) {
                                Log.d(TAG, "点击最小化窗口")
                                minimizeWindow()
                            }
                        }
                        true
                    }
                    
                    else -> false
                }
            }
            
            // 只为最小化视图和背景区域设置拖动
            val miniLayout = view.findViewById<LinearLayout>(R.id.mini_layout)
            miniLayout.setOnTouchListener(touchListener)
            
            // 为整个悬浮窗根视图设置拖动，但会被子视图的触摸事件覆盖
            view.setOnTouchListener(touchListener)
        }
    }
    
    private fun limitWindowBounds(params: WindowManager.LayoutParams) {
        try {
            val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val size = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                // Android 11+ 使用新API
                val metrics = windowManager.currentWindowMetrics
                val bounds = metrics.bounds
                android.graphics.Point(bounds.width(), bounds.height())
            } else {
                // Android 10及以下使用旧API
                @Suppress("DEPRECATION")
                val display = windowManager.defaultDisplay
                val point = android.graphics.Point()
                @Suppress("DEPRECATION")
                display.getSize(point)
                point
            }
            
            val screenWidth = size.x
            val screenHeight = size.y
            
            // 获取悬浮窗的宽高，如果还未测量则使用预估值
            val viewWidth = if (floatingView?.width ?: 0 > 0) floatingView!!.width else 200
            val viewHeight = if (floatingView?.height ?: 0 > 0) floatingView!!.height else 150
            
            // 限制X坐标，保留小边距
            val margin = 10
            when {
                params.x < -margin -> params.x = -margin
                params.x > screenWidth - viewWidth + margin -> params.x = screenWidth - viewWidth + margin
            }
            
            // 限制Y坐标，考虑状态栏高度
            val statusBarHeight = getStatusBarHeight()
            when {
                params.y < statusBarHeight -> params.y = statusBarHeight
                params.y > screenHeight - viewHeight - navigationBarHeight() -> {
                    params.y = screenHeight - viewHeight - navigationBarHeight()
                }
            }
            
            Log.d(TAG, "限制窗口位置: x=${params.x}, y=${params.y}, 屏幕: ${screenWidth}x${screenHeight}")
            
        } catch (e: Exception) {
            Log.e(TAG, "限制窗口边界失败: ${e.message}")
        }
    }
    
    private fun getStatusBarHeight(): Int {
        return try {
            val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
            if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else 75
        } catch (e: Exception) {
            75 // 默认状态栏高度
        }
    }
    
    private fun navigationBarHeight(): Int {
        return try {
            val resourceId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
            if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else 0
        } catch (e: Exception) {
            0
        }
    }
    
    private fun removeFloatingWindow() {
        if (isShowing && floatingView != null) {
            try {
                windowManager?.removeView(floatingView)
                isShowing = false
            } catch (e: Exception) {
                Log.e(TAG, "移除悬浮窗失败: ${e.message}")
            }
        }
    }
} 