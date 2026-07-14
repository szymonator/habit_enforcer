package expo.modules.habitblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.view.Gravity
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
    private var alarmId: Int = -1
    private var lastDetectedPackage: String? = null

    data class PendingBlocker(
        val targetPackageName: String,
        val durationSeconds: Int,
        val isTest: Boolean,
        val alarmId: Int
    )

    private val pendingQueue = mutableListOf<PendingBlocker>()
    private var isActive = false

    private var isWarningActive = false
    private var warningSecondsRemaining = 0
    private var isSnoozeActive = false
    private var snoozeSecondsRemaining = 0
    private var isTestSnoozeUsed = false

    private lateinit var sharedPreferences: SharedPreferences
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var notificationManager: NotificationManager

    private val bypassPackages = mutableSetOf<String>()

    // Views to update in the loop
    private var progressView: TextView? = null
    private var timeRemainingView: TextView? = null

    companion object {
        const val NOTIFICATION_ID = 8888
        const val WARNING_NOTIFICATION_ID = 8890
        const val CHANNEL_ID = "habit_blocker_service_channel"
        const val WARNING_CHANNEL_ID = "habit_blocker_warning_channel_v3"
        const val PREFS_NAME = "HabitBlockerPrefs"
        const val KEY_ELAPSED_TIME = "elapsed_time_seconds"
        const val KEY_LAST_DATE = "last_block_date"
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        bypassPackages.addAll(setOf(
            packageName,
            "com.android.settings",
            "com.android.phone",
            "com.android.server.telecom",
            "com.google.android.dialer",
            "com.android.dialer",
            "com.samsung.android.dialer",
            "com.google.android.apps.messaging",
            "com.android.mms",
            "com.samsung.android.messaging",
            "com.android.packageinstaller",
            "com.google.android.packageinstaller",
            "com.android.systemui",
            "com.google.android.apps.maps",
            "com.waze",
            "com.google.android.deskclock",
            "com.android.deskclock",
            "com.sec.android.app.clockpackage",
            "com.google.android.apps.authenticator2",
            "com.microsoft.emmx",
            "com.duosecurity.duomobile",
            "com.authy.authy",
            "com.android.camera",
            "com.google.android.GoogleCamera",
            "com.sec.android.app.camera"
        ))
    }

    private fun getPrefsKey(currentDate: String): String {
        return if (isTestMode) {
            "elapsed_time_test_${targetPackageName}"
        } else {
            "elapsed_time_schedule_${alarmId}_${currentDate}"
        }
    }

    private fun stopServiceEarly() {
        createNotificationChannel()
        val notification = createNotification("Habit Block Active", "Finished tracking.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        stopSelf()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val pkg = intent?.getStringExtra("targetPackageName") ?: ""
        val dur = intent?.getIntExtra("durationSeconds", 900) ?: 900
        val test = intent?.getBooleanExtra("isTest", false) ?: false
        val id = intent?.getIntExtra("alarmId", -1) ?: -1

        if (pkg.isEmpty()) {
            if (!isActive && pendingQueue.isEmpty()) {
                stopServiceEarly()
                return START_NOT_STICKY
            }
            return START_REDELIVER_INTENT
        }

        val currentDate = getCurrentDateString()
        val isCompleted = !test && (sharedPreferences.getInt("elapsed_time_schedule_${id}_${currentDate}", 0) >= dur)

        if (!isCompleted) {
            val isDuplicate = (isActive && targetPackageName == pkg && alarmId == id && isTestMode == test) ||
                    pendingQueue.any { it.targetPackageName == pkg && it.alarmId == id && it.isTest == test }
            if (!isDuplicate) {
                pendingQueue.add(PendingBlocker(pkg, dur, test, id))
            }
        }

        if (!isActive) {
            if (pendingQueue.isEmpty()) {
                stopServiceEarly()
                return START_NOT_STICKY
            }

            createNotificationChannel()
            val habitIntent = getLaunchPendingIntent(pkg, 1)
            val notification = createNotification(
                "Habit Block Active", 
                "Tracking usage of the target app.", 
                contentIntent = habitIntent
            )
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }

            isActive = true
            startNextBlocker()
        }

        return START_REDELIVER_INTENT
    }

    private fun getCurrentDateString(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(java.util.Date())
    }

    private fun isScreenInteractive(): Boolean {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            powerManager.isInteractive
        } else {
            @Suppress("DEPRECATION")
            powerManager.isScreenOn
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Habit Blocker Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val warningChannel = NotificationChannel(
                WARNING_CHANNEL_ID,
                "Habit Blocker Warnings",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts for incoming habit blocks"
                setSound(defaultSoundUri, null)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
            manager.createNotificationChannel(warningChannel)
        }
    }

    private fun getLaunchPendingIntent(targetPackage: String, requestCode: Int): PendingIntent? {
        val launchIntent = packageManager.getLaunchIntentForPackage(targetPackage) ?: return null
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        return PendingIntent.getActivity(
            this,
            requestCode,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createNotification(
        title: String,
        text: String,
        channelId: String = CHANNEL_ID,
        isSilent: Boolean = true,
        onlyAlertOnce: Boolean = false,
        contentIntent: PendingIntent? = null
    ): Notification {
        val builder = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(if (isSilent) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_MAX)
            .setSilent(isSilent)
            .setOnlyAlertOnce(onlyAlertOnce)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent)
        }

        if (!isSilent) {
            val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            builder.setSound(defaultSoundUri)
            builder.setDefaults(Notification.DEFAULT_ALL)
        }

        return builder.build()
    }

    private fun setupOverlay() {
        val context = this
        overlayView = FrameLayout(context).apply {
            setBackgroundColor(Color.parseColor("#F20F172A")) // 95% opacity slate-900
            @Suppress("DEPRECATION")
            systemUiVisibility = (
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
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

        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(targetPackageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            "Target App"
        }

        val launchButton = Button(context).apply {
            text = "Start Habit (Open $appLabel)"
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

        val snoozeAlreadyUsed = isSnoozeUsedToday()
        if (!snoozeAlreadyUsed) {
            val snoozeButton = Button(context).apply {
                text = "Snooze (5 mins)"
                setTextColor(Color.WHITE)
                textSize = 16f
                setBackgroundColor(Color.parseColor("#475569")) // slate-600
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (55 * resources.displayMetrics.density).toInt()
                ).apply {
                    bottomMargin = (24 * resources.displayMetrics.density).toInt()
                }
                setOnClickListener {
                    triggerSnooze()
                }
            }
            container.addView(snoozeButton)
        }

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

                val isTargetActive = foregroundApp == targetPackageName
                val shouldBypass = isTargetActive || bypassPackages.contains(foregroundApp)

                if (isTargetActive && isScreenInteractive()) {
                    elapsedTimeSeconds++
                    val currentDate = getCurrentDateString()
                    sharedPreferences.edit().putInt(getPrefsKey(currentDate), elapsedTimeSeconds).apply()
                    updateOverlayUI()

                    // If they enter the target app, early cancel the warning phase!
                    if (isWarningActive) {
                        isWarningActive = false
                        notificationManager.cancel(WARNING_NOTIFICATION_ID)
                    }

                    if (elapsedTimeSeconds >= targetDurationSeconds) {
                        triggerCompletionNotification()
                        startNextBlocker()
                        return
                    }
                }

                // Handle warning phase
                if (isWarningActive) {
                    warningSecondsRemaining--
                    val title = "Habit Block Incoming"
                    val text = "Overlay will activate in $warningSecondsRemaining seconds.\nSave your work."
                    val habitIntent = getLaunchPendingIntent(targetPackageName, 2)
                    notificationManager.notify(
                        WARNING_NOTIFICATION_ID,
                        createNotification(
                            title, text, WARNING_CHANNEL_ID,
                            isSilent = false, onlyAlertOnce = true,
                            contentIntent = habitIntent
                        )
                    )

                    hideOverlay() // Ensure overlay is not shown during warning countdown

                    if (warningSecondsRemaining <= 0) {
                        isWarningActive = false
                        notificationManager.cancel(WARNING_NOTIFICATION_ID)
                    }

                    handler.postDelayed(this, 1000)
                    return
                }

                // Handle snooze phase
                if (isSnoozeActive) {
                    snoozeSecondsRemaining--
                    val title = "Habit Block Snoozed"
                    val minutes = snoozeSecondsRemaining / 60
                    val seconds = snoozeSecondsRemaining % 60
                    val text = String.format(Locale.getDefault(), "Resuming in %dm %02ds", minutes, seconds)
                    val habitIntent = getLaunchPendingIntent(targetPackageName, 3)
                    notificationManager.notify(NOTIFICATION_ID, createNotification(title, text, contentIntent = habitIntent))

                    hideOverlay() // Ensure overlay is not shown during snooze

                    if (snoozeSecondsRemaining <= 0) {
                        isSnoozeActive = false
                    }

                    handler.postDelayed(this, 1000)
                    return
                }

                // Regular blocker phase
                val remaining = (targetDurationSeconds - elapsedTimeSeconds).coerceAtLeast(0)
                val text = formatTime(remaining)
                val habitIntent = getLaunchPendingIntent(targetPackageName, 4)
                notificationManager.notify(NOTIFICATION_ID, createNotification("Habit Blocker Active", text, contentIntent = habitIntent))

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

    private fun startNextBlocker() {
        if (pendingQueue.isEmpty()) {
            isActive = false
            hideOverlay()
            stopSelf()
            return
        }

        val next = pendingQueue.removeAt(0)
        targetPackageName = next.targetPackageName
        targetDurationSeconds = next.durationSeconds
        isTestMode = next.isTest
        alarmId = next.alarmId

        // Reset warning/snooze states for this new blocker
        isWarningActive = true
        warningSecondsRemaining = 60
        isSnoozeActive = false
        snoozeSecondsRemaining = 0
        isTestSnoozeUsed = false

        val currentDate = getCurrentDateString()
        val prefsKey = getPrefsKey(currentDate)

        if (isTestMode) {
            sharedPreferences.edit().remove(prefsKey).apply()
            elapsedTimeSeconds = 0
        } else {
            elapsedTimeSeconds = sharedPreferences.getInt(prefsKey, 0)
            if (elapsedTimeSeconds >= targetDurationSeconds) {
                // If this blocked habit was already completed in the meantime, skip to the next one
                startNextBlocker()
                return
            }
        }

        hideOverlay()
        overlayView = null
        setupOverlay()
        updateOverlayUI()

        // Restart/ensure the tracking loop runs with updated configurations
        if (::checkRunnable.isInitialized) {
            handler.removeCallbacks(checkRunnable)
            handler.post(checkRunnable)
        } else {
            startTrackingLoop()
        }
    }

    private fun isSnoozeUsedToday(): Boolean {
        if (isTestMode) {
            return isTestSnoozeUsed
        }
        val currentDate = getCurrentDateString()
        val snoozeKey = "snoozed_today_schedule_${alarmId}_${currentDate}"
        return sharedPreferences.getBoolean(snoozeKey, false)
    }

    private fun triggerSnooze() {
        if (isTestMode) {
            isTestSnoozeUsed = true
        } else {
            val currentDate = getCurrentDateString()
            val snoozeKey = "snoozed_today_schedule_${alarmId}_${currentDate}"
            sharedPreferences.edit().putBoolean(snoozeKey, true).apply()
        }

        isSnoozeActive = true
        snoozeSecondsRemaining = 300 // 5 minutes
        hideOverlay()

        // Recreate the overlay to update the button visibility when the overlay is shown next time
        overlayView = null
        setupOverlay()

        Toast.makeText(this, "Blocker snoozed for 5 minutes.", Toast.LENGTH_SHORT).show()
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
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
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        isOverlayVisible = false
    }

    private fun getForegroundPackageName(): String? {
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 30_000 // 30 seconds
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
        val blockerIntent = getLaunchPendingIntent(packageName, 5)
        val notification = createNotification(
            "Habit Completed!",
            "Well done! You have completed your habit for today.",
            contentIntent = blockerIntent
        )
        notificationManager.notify(8889, notification)
        Toast.makeText(this, "Habit completed! Overlay disabled.", Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        hideOverlay()
        notificationManager.cancel(WARNING_NOTIFICATION_ID)
        if (::checkRunnable.isInitialized) {
            handler.removeCallbacks(checkRunnable)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
