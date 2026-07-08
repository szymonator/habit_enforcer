package expo.modules.habitblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restores all scheduled alarms after a device reboot.
 * Android clears all AlarmManager alarms on reboot, so this receiver
 * reads the persisted schedule metadata and re-registers every alarm.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val schedules = AlarmScheduler.getAllSchedules(context)
        for (schedule in schedules) {
            try {
                AlarmScheduler.scheduleAlarm(
                    context,
                    id = schedule.getInt("id"),
                    hour = schedule.getInt("hour"),
                    minute = schedule.getInt("minute"),
                    targetPackage = schedule.getString("targetPackageName"),
                    durationSeconds = schedule.getInt("durationSeconds")
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
