package com.example.vpnself.script

import android.util.Log
import java.util.concurrent.atomic.AtomicLong

/**
 * 性能监控工具类
 * 用于监控和诊断脚本的性能问题
 */
object PerformanceMonitor {
    
    private const val TAG = "PerformanceMonitor"
    
    private val eventCount = AtomicLong(0)
    private val jsInjectionCount = AtomicLong(0)
    private val apiCallCount = AtomicLong(0)
    private val lastResetTime = AtomicLong(System.currentTimeMillis())
    
    private var isEnabled = false
    
    fun enable() {
        isEnabled = true
        Log.d(TAG, "性能监控已启用")
    }
    
    fun disable() {
        isEnabled = false
        Log.d(TAG, "性能监控已禁用")
    }
    
    fun recordAccessibilityEvent() {
        if (isEnabled) {
            eventCount.incrementAndGet()
        }
    }
    
    fun recordJavaScriptInjection() {
        if (isEnabled) {
            jsInjectionCount.incrementAndGet()
        }
    }
    
    fun recordApiCall() {
        if (isEnabled) {
            apiCallCount.incrementAndGet()
        }
    }
    
    fun getStats(): PerformanceStats {
        val currentTime = System.currentTimeMillis()
        val timeElapsed = currentTime - lastResetTime.get()
        
        return PerformanceStats(
            eventCount = eventCount.get(),
            jsInjectionCount = jsInjectionCount.get(),
            apiCallCount = apiCallCount.get(),
            timeElapsedMs = timeElapsed,
            eventsPerSecond = if (timeElapsed > 0) (eventCount.get() * 1000.0 / timeElapsed) else 0.0
        )
    }
    
    fun reset() {
        eventCount.set(0)
        jsInjectionCount.set(0)
        apiCallCount.set(0)
        lastResetTime.set(System.currentTimeMillis())
        Log.d(TAG, "性能统计已重置")
    }
    
    fun logStats() {
        if (isEnabled) {
            val stats = getStats()
            Log.d(TAG, "性能统计: $stats")
            
            // 如果事件频率过高，发出警告
            if (stats.eventsPerSecond > 10) {
                Log.w(TAG, "警告: 无障碍事件频率过高 (${stats.eventsPerSecond}/秒)")
            }
        }
    }
    
    data class PerformanceStats(
        val eventCount: Long,
        val jsInjectionCount: Long,
        val apiCallCount: Long,
        val timeElapsedMs: Long,
        val eventsPerSecond: Double
    ) {
        override fun toString(): String {
            return "事件数: $eventCount, JS注入: $jsInjectionCount, API调用: $apiCallCount, " +
                   "时间: ${timeElapsedMs}ms, 事件频率: ${"%.2f".format(eventsPerSecond)}/秒"
        }
    }
} 