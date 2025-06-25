package com.example.vpnself.script

import android.content.Context

/**
 * NetworkMonitor单例管理器
 * 确保NetworkMonitor实例和数据在整个应用中共享
 */
object NetworkMonitorManager {
    
    private var networkMonitor: NetworkMonitor? = null
    
    /**
     * 获取或创建NetworkMonitor实例
     */
    fun getInstance(context: Context): NetworkMonitor {
        if (networkMonitor == null) {
            networkMonitor = NetworkMonitor(context.applicationContext)
        }
        return networkMonitor!!
    }
    
    /**
     * 获取当前实例（如果存在）
     */
    fun getCurrentInstance(): NetworkMonitor? {
        return networkMonitor
    }
    
    /**
     * 清除实例
     */
    fun clearInstance() {
        networkMonitor = null
    }
} 