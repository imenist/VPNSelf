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
import android.view.View
import android.view.WindowManager
import android.widget.Button
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
    
    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var apiCountText: TextView
    
    private val apiReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.example.vpnself.API_CAPTURED") {
                val api = intent.getStringExtra("api") ?: ""
                updateApiCount()
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createFloatingWindow()
        
        // 注册广播接收器
        val filter = IntentFilter("com.example.vpnself.API_CAPTURED")
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
            val params = WindowManager.LayoutParams(
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
            
            // 添加到窗口管理器
            windowManager?.addView(floatingView, params)
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
            apiCountText = view.findViewById(R.id.tv_api_count)
            
            // 设置点击事件
            startButton.setOnClickListener {
                AutoBuyAccessibilityService.instance?.startScript()
                updateStatus()
            }
            
            stopButton.setOnClickListener {
                AutoBuyAccessibilityService.instance?.stopScript()
                updateStatus()
            }
            
            // 最小化按钮
            view.findViewById<Button>(R.id.btn_minimize).setOnClickListener {
                minimizeWindow()
            }
            
            // 关闭按钮
            view.findViewById<Button>(R.id.btn_close).setOnClickListener {
                stopSelf()
            }
        }
    }
    
    private fun updateStatus() {
        val service = AutoBuyAccessibilityService.instance
        if (service != null) {
            statusText.text = "状态: ${service.getScriptStatus()}"
            updateApiCount()
        } else {
            statusText.text = "状态: 服务未启动"
            apiCountText.text = "API: 0"
        }
    }
    
    private fun updateApiCount() {
        val service = AutoBuyAccessibilityService.instance
        val count = service?.getCapturedApis()?.size ?: 0
        apiCountText.text = "API: $count"
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