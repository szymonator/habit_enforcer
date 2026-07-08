package expo.modules.habitblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Receives the scheduled alarm, starts the BlockerService foreground service,
 * then re-schedules the same alarm for the next day so it repeats daily.
 */
class BlockerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val targetPackageName = intent.getStringExtra("targetPackageName") ?: return
        val durationSeconds = intent.getIntExtra("durationSeconds", 900)
        val alarmId = intent.getIntExtra("alarmId", -1)
        val hour = intent.getIntExtra("hour", -1)
        val minute = intent.getIntExtra("minute", -1)

        // Start the blocker foreground service
        val serviceIntent = Intent(context, BlockerService::class.java).apply {
            putExtra("targetPackageName", targetPackageName)
            putExtra("durationSeconds", durationSeconds)
            putExtra("alarmId", alarmId)
            putExtra("isTest", false)
        }

        try {
            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Re-schedule the same alarm for tomorrow so it repeats daily
        if (alarmId != -1 && hour != -1 && minute != -1) {
            try {
                AlarmScheduler.scheduleAlarm(
                    context, alarmId, hour, minute, targetPackageName, durationSeconds
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
