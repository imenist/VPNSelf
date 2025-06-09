package com.example.vpnself.ui.common.home

import android.content.Context
import androidx.lifecycle.ViewModel
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

    fun startCapture() {
        // TODO: 实现VPN连接和抓包逻辑
        _isCapturing.value = true
    }

    fun stopCapture() {
        // TODO: 实现停止VPN连接和抓包逻辑
        _isCapturing.value = false
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
}