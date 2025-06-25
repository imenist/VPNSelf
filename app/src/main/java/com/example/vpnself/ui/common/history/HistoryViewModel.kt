package com.example.vpnself.ui.common.history

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.text.SimpleDateFormat
import java.util.*
import com.example.vpnself.script.NetworkMonitor
import com.example.vpnself.script.NetworkMonitorManager

class HistoryViewModel : ViewModel() {
    // 使用NetworkMonitor的CaptureSession作为数据模型
    private val _captureHistory = MutableStateFlow<List<NetworkMonitor.CaptureSession>>(emptyList())
    val captureHistory: StateFlow<List<NetworkMonitor.CaptureSession>> = _captureHistory
    
    private val _selectedSession = MutableStateFlow<NetworkMonitor.CaptureSession?>(null)
    val selectedSession: StateFlow<NetworkMonitor.CaptureSession?> = _selectedSession
    
    private val _currentLogs = MutableStateFlow<List<NetworkMonitor.LogEntry>>(emptyList())
    val currentLogs: StateFlow<List<NetworkMonitor.LogEntry>> = _currentLogs

    init {
        // 从NetworkMonitor获取实时日志
        loadRealTimeData()
    }

    fun loadRealTimeData() {
        // 获取NetworkMonitor实例的当前日志和历史会话
        val networkMonitor = NetworkMonitorManager.getCurrentInstance()
        if (networkMonitor != null) {
            // 设置日志更新回调
            networkMonitor.setOnLogUpdatedCallback { logs ->
                _currentLogs.value = logs
            }
            
            // 初始化当前日志
            _currentLogs.value = networkMonitor.getCurrentSessionLogs()
            
            // 加载历史会话
            _captureHistory.value = networkMonitor.getAllSessions()
        }
    }

    fun onHistoryItemClick(session: NetworkMonitor.CaptureSession) {
        // 显示选中会话的详细信息
        _selectedSession.value = session
    }
    
    /**
     * 更新当前实时日志
     */
    fun updateCurrentLogs(logs: List<NetworkMonitor.LogEntry>) {
        _currentLogs.value = logs
    }
    
    /**
     * 刷新历史记录
     */
    fun refreshHistory() {
        val networkMonitor = NetworkMonitorManager.getCurrentInstance()
        if (networkMonitor != null) {
            _captureHistory.value = networkMonitor.getAllSessions()
        }
    }

    fun clearHistory() {
        val networkMonitor = NetworkMonitorManager.getCurrentInstance()
        networkMonitor?.clearAllData()
        _captureHistory.value = emptyList()
        _selectedSession.value = null
        _currentLogs.value = emptyList()
    }
} 