package com.example.vpnself.ui.common.home

import android.app.Activity
import android.content.Context
import androidx.lifecycle.ViewModel
import com.example.vpnself.script.NetworkMonitor
import com.example.vpnself.script.NetworkMonitorManager
import com.example.vpnself.ui.common.history.HistoryActivity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class TrafficStats(
    val uploadBytes: Long = 0,
    val downloadBytes: Long = 0,
    val requestCount: Int = 0
)

class HomeViewModel : ViewModel() {
    private val _trafficStats = MutableStateFlow(TrafficStats())
    val trafficStats: StateFlow<TrafficStats> = _trafficStats

    private val _isCapturing = MutableStateFlow(false)
    val isCapturing: StateFlow<Boolean> = _isCapturing
    
    // 新增：NetworkMonitor实例管理
    private var captureStartTime = 0L

    private fun getNetworkMonitor(context: Context): NetworkMonitor {
        return NetworkMonitorManager.getInstance(context)
    }

    fun startCapture(context: Context) {
        val networkMonitor = getNetworkMonitor(context)
        
        // 设置API捕获回调
        networkMonitor.setOnApiCapturedCallback { request ->
            // 更新流量统计
            val currentStats = _trafficStats.value
            updateTrafficStats(
                uploadBytes = currentStats.uploadBytes + request.requestBody.length,
                downloadBytes = currentStats.downloadBytes + request.responseBody.length,
                requestCount = currentStats.requestCount + 1
            )
        }
        
        // 开始NetworkMonitor抓包（仅JavaScript注入，不启动VPN）
        networkMonitor.startCapture()
        captureStartTime = System.currentTimeMillis()
        _isCapturing.value = true
        
        networkMonitor.addLog(
            NetworkMonitor.LogLevel.SUCCESS,
            "H5 API监控已启动",
            "等待WebView加载和JavaScript注入，无需VPN权限"
        )
    }



    fun stopCapture(context: Context) {
        _isCapturing.value = false
        
        // 停止NetworkMonitor抓包并保存会话
        val networkMonitor = getNetworkMonitor(context)
        val session = networkMonitor.stopCapture()
        
        // 记录完成信息
        networkMonitor.addLog(
            NetworkMonitor.LogLevel.SUCCESS,
            "🏁 H5 API监控已停止",
            "会话 ${session.sessionName} 已保存到历史记录"
        )
    }

    fun navigateToCaptureHistory(context: Context) {
        HistoryActivity.start(context)
    }

    fun updateTrafficStats(uploadBytes: Long, downloadBytes: Long, requestCount: Int) {
        _trafficStats.value = TrafficStats(
            uploadBytes = uploadBytes,
            downloadBytes = downloadBytes,
            requestCount = requestCount
        )
    }
    


    /**
     * 获取NetworkMonitor实例以便在外部配置WebView
     */
    fun getNetworkMonitorForWebView(context: Context): NetworkMonitor {
        return getNetworkMonitor(context)
    }
}