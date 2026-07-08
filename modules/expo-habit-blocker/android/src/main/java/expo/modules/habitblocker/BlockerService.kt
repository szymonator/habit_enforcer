package expo.modules.habitblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import java.util.Locale

class BlockerService : Service() {

    private lateinit var windowManager: WindowManager
    private var overlayView: FrameLayout? = null
    private var isOverlayVisible = false

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var checkRunnable: Runnable

    private var targetPackageName: String = ""
    private var targetDurationSeconds: Int = 900 // Default 15 minutes
    private var elapsedTimeSeconds: Int = 0
    private var isTestMode: Boolean = false
    private var lastDetectedPackage: String? = null

    private lateinit var sharedPreferences: SharedPreferences

    // Views to update in the loop
    private var progressView: TextView? = null
    private var timeRemainingView: TextView? = null

    companion object {
        const val NOTIFICATION_ID = 8888
        const val CHANNEL_ID = "habit_blocker_service_channel"
        const val PREFS_NAME = "HabitBlockerPrefs"
        const val KEY_ELAPSED_TIME = "elapsed_time_seconds"
        const val KEY_LAST_DATE = "last_block_date"
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun getPrefsKey(currentDate: String): String {
        return if (isTestMode) {
            "elapsed_time_test_${targetPackageName}"
        } else {
            "elapsed_time_${targetPackageName}_${currentDate}"
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        targetPackageName = intent?.getStringExtra("targetPackageName") ?: ""
        targetDurationSeconds = intent?.getIntExtra("durationSeconds", 900) ?: 900
        isTestMode = intent?.getBooleanExtra("isTest", false) ?: false

        if (targetPackageName.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }

        // Initialize state
        val currentDate = getCurrentDateString()
        elapsedTimeSeconds = sharedPreferences.getInt(getPrefsKey(currentDate), 0)

        createNotificationChannel()
        val notification = createNotification("Habit Block Active", "Tracking usage of the target app.")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        setupOverlay()
        startTrackingLoop()

        return START_REDELIVER_INTENT
    }

    private fun getCurrentDateString(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(java.util.Date())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Habit Blocker Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(title: String, text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
    }

    private fun setupOverlay() {
        val context = this
        overlayView = FrameLayout(context).apply {
            setBackgroundColor(Color.parseColor("#F20F172A")) // 95% opacity slate-900
        }

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val padding = (32 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
        }

        val titleView = TextView(context).apply {
            text = "Habit Enforcer"
            textSize = 28f
            setTextColor(Color.WHITE)
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (12 * resources.displayMetrics.density).toInt()
            }
        }

        val subtitleView = TextView(context).apply {
            text = "Your phone is locked until you complete your habit!"
            textSize = 15f
            setTextColor(Color.parseColor("#94A3B8")) // slate-400
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (40 * resources.displayMetrics.density).toInt()
            }
        }

        progressView = TextView(context).apply {
            text = "0% Completed"
            textSize = 24f
            setTextColor(Color.parseColor("#38BDF8")) // sky-400
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (8 * resources.displayMetrics.density).toInt()
            }
        }

        timeRemainingView = TextView(context).apply {
            text = formatTime(targetDurationSeconds - elapsedTimeSeconds)
            textSize = 14f
            setTextColor(Color.parseColor("#64748B")) // slate-500
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (48 * resources.displayMetrics.density).toInt()
            }
        }

        val launchButton = Button(context).apply {
            text = "Start Habit (Open Target App)"
            setTextColor(Color.WHITE)
            textSize = 16f
            // Indigo background
            setBackgroundColor(Color.parseColor("#4F46E5"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (55 * resources.displayMetrics.density).toInt()
            ).apply {
                bottomMargin = (24 * resources.displayMetrics.density).toInt()
            }
            setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(targetPackageName)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(launchIntent)
                } else {
                    Toast.makeText(context, "Target app package not found: $targetPackageName", Toast.LENGTH_LONG).show()
                }
            }
        }

        container.addView(titleView)
        container.addView(subtitleView)
        container.addView(progressView)
        container.addView(timeRemainingView)
        container.addView(launchButton)

        // Add developer safety button
        val exitButton = Button(context).apply {
            text = "Exit Test Block"
            setTextColor(Color.parseColor("#EF4444"))
            textSize = 13f
            setBackgroundColor(Color.TRANSPARENT)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                stopSelf()
            }
        }
        container.addView(exitButton)

        overlayView?.addView(container, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
            Gravity.CENTER
        ))

        updateOverlayUI()
    }

    private fun formatTime(seconds: Int): String {
        val m = seconds / 60
        val s = seconds % 60
        return String.format(Locale.getDefault(), "Remaining: %dm %02ds", m, s)
    }

    private fun updateOverlayUI() {
        val percentage = ((elapsedTimeSeconds.toFloat() / targetDurationSeconds.toFloat()) * 100).toInt().coerceAtMost(100)
        progressView?.text = String.format(Locale.getDefault(), "%d%% Completed", percentage)
        val remaining = (targetDurationSeconds - elapsedTimeSeconds).coerceAtLeast(0)
        timeRemainingView?.text = formatTime(remaining)
    }

    private fun startTrackingLoop() {
        checkRunnable = object : Runnable {
            override fun run() {
                val foregroundApp = getForegroundPackageName()
                val bypassPackages = setOf(
                    packageName,
                    "com.android.settings",
                    "com.android.phone",
                    "com.android.server.telecom",
                    "com.google.android.dialer"
                )

                val isTargetActive = foregroundApp == targetPackageName
                val shouldBypass = isTargetActive || bypassPackages.contains(foregroundApp)

                if (isTargetActive) {
                    elapsedTimeSeconds++
                    val currentDate = getCurrentDateString()
                    sharedPreferences.edit().putInt(getPrefsKey(currentDate), elapsedTimeSeconds).apply()
                    updateOverlayUI()

                    if (elapsedTimeSeconds >= targetDurationSeconds) {
                        triggerCompletionNotification()
                        stopSelf()
                        return
                    }
                }

                // Update notification text with remaining time!
                val remaining = (targetDurationSeconds - elapsedTimeSeconds).coerceAtLeast(0)
                val text = formatTime(remaining)
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.notify(NOTIFICATION_ID, createNotification("Habit Blocker Active", text))

                if (shouldBypass) {
                    hideOverlay()
                } else {
                    showOverlay()
                }

                handler.postDelayed(this, 1000)
            }
        }
        handler.post(checkRunnable)
    }

    private fun showOverlay() {
        if (!isOverlayVisible && overlayView != null) {
            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            try {
                windowManager.addView(overlayView, layoutParams)
                isOverlayVisible = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun hideOverlay() {
        if (isOverlayVisible && overlayView != null) {
            try {
                windowManager.removeView(overlayView)
                isOverlayVisible = false
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun getForegroundPackageName(): String? {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 5 * 60 * 1000 // 5 minutes
        val events = usageStatsManager.queryEvents(startTime, endTime)
        val event = UsageEvents.Event()
        var lastForegroundApp: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                lastForegroundApp = event.packageName
            }
        }
        if (lastForegroundApp != null) {
            lastDetectedPackage = lastForegroundApp
        }
        return lastDetectedPackage
    }

    private fun triggerCompletionNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = createNotification("Habit Completed!", "Well done! You have completed your habit for today.")
        notificationManager.notify(8889, notification)
        Toast.makeText(this, "Habit completed! Overlay disabled.", Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        hideOverlay()
        handler.removeCallbacks(checkRunnable)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
