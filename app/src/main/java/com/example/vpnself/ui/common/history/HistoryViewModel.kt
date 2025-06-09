package com.example.vpnself.ui.common.history

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.text.SimpleDateFormat
import java.util.*

data class CaptureHistoryItem(
    val id: String = UUID.randomUUID().toString(),
    val timestamp: String,
    val duration: Int, // 持续时间（秒）
    val uploadBytes: Long = 0,
    val downloadBytes: Long = 0,
    val requestCount: Int = 0
)

class HistoryViewModel : ViewModel() {
    private val _captureHistory = MutableStateFlow<List<CaptureHistoryItem>>(emptyList())
    val captureHistory: StateFlow<List<CaptureHistoryItem>> = _captureHistory

    init {
        // TODO: 从数据库加载历史记录
        loadMockData() // 临时使用模拟数据
    }

    private fun loadMockData() {
        val mockData = listOf(
            CaptureHistoryItem(
                timestamp = "05-30 10:44:45",
                duration = 26
            ),
            CaptureHistoryItem(
                timestamp = "05-21 12:53:27",
                duration = 19
            ),
            CaptureHistoryItem(
                timestamp = "05-18 10:44:36",
                duration = 15
            ),
            CaptureHistoryItem(
                timestamp = "04-28 02:30:13",
                duration = 16
            )
        )
        _captureHistory.value = mockData
    }

    fun onHistoryItemClick(item: CaptureHistoryItem) {
        // TODO: 导航到详情页面
    }

    fun addCaptureHistory(
        duration: Int,
        uploadBytes: Long = 0,
        downloadBytes: Long = 0,
        requestCount: Int = 0
    ) {
        val dateFormat = SimpleDateFormat("MM-dd HH:mm:ss", Locale.getDefault())
        val timestamp = dateFormat.format(Date())
        
        val newItem = CaptureHistoryItem(
            timestamp = timestamp,
            duration = duration,
            uploadBytes = uploadBytes,
            downloadBytes = downloadBytes,
            requestCount = requestCount
        )
        
        _captureHistory.value = listOf(newItem) + _captureHistory.value
    }

    fun clearHistory() {
        // TODO: 清除数据库中的历史记录
        _captureHistory.value = emptyList()
    }
} 