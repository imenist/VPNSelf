package com.example.vpnself.ui.common.home

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import androidx.lifecycle.ViewModel
import com.example.vpnself.ui.common.history.HistoryActivity
import com.example.vpnself.vpn.PacketCaptureService
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

    fun startCapture(activity: Activity) {
        val vpnIntent = VpnService.prepare(activity)
        if (vpnIntent != null) {
            activity.startActivityForResult(vpnIntent, VPN_REQUEST_CODE)
        } else {
            onVpnPermissionGranted(activity)
        }
    }

    fun onVpnPermissionGranted(context: Context) {
        val intent = Intent(context, PacketCaptureService::class.java)
        context.startService(intent)
        _isCapturing.value = true
    }

    fun stopCapture(context: Context) {
        val intent = Intent(context, PacketCaptureService::class.java).apply {
            action = "STOP"
        }
        context.startService(intent)
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

    companion object {
        const val VPN_REQUEST_CODE = 1
    }
}