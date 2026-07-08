package expo.modules.habitblocker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Shared utility for scheduling/cancelling alarms and persisting schedule metadata
 * in SharedPreferences so that BlockerReceiver can re-schedule the next day's alarm
 * and BootReceiver can restore all alarms after a device reboot.
 */
object AlarmScheduler {
    private const val PREFS_NAME = "HabitBlockerSchedules"
    private const val KEY_SCHEDULES = "all_schedules"

    /**
     * Schedule a one-shot exact alarm for the next occurrence of [hour]:[minute].
     * The intent carries all metadata so the receiver can re-schedule for the following day.
     */
    fun scheduleAlarm(
        context: Context,
        id: Int,
        hour: Int,
        minute: Int,
        targetPackage: String,
        durationSeconds: Int
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, BlockerReceiver::class.java).apply {
            putExtra("targetPackageName", targetPackage)
            putExtra("durationSeconds", durationSeconds)
            putExtra("alarmId", id)
            putExtra("hour", hour)
            putExtra("minute", minute)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val calendar = Calendar.getInstance().apply {
            timeInMillis = System.currentTimeMillis()
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        val canScheduleExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }

        if (canScheduleExact) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent
                )
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent
                )
            }
        }
    }

    /** Cancel a previously scheduled alarm by its ID. */
    fun cancelAlarm(context: Context, id: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, BlockerReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context, id, intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    // ---- SharedPreferences persistence ----

    /** Save schedule metadata so it can be restored after reboot or used for re-scheduling. */
    fun saveSchedule(
        context: Context,
        id: Int,
        hour: Int,
        minute: Int,
        targetPackage: String,
        durationSeconds: Int
    ) {
        val prefs = getPrefs(context)
        val schedules = loadAllSchedules(prefs).toMutableList()

        // Remove any existing entry with the same id
        schedules.removeAll { it.getInt("id") == id }

        schedules.add(JSONObject().apply {
            put("id", id)
            put("hour", hour)
            put("minute", minute)
            put("targetPackageName", targetPackage)
            put("durationSeconds", durationSeconds)
        })

        persistSchedules(prefs, schedules)

        // Reset today's progress for this schedule ID when edited/saved
        val currentDate = getCurrentDateString()
        val sharedPrefs = context.getSharedPreferences("HabitBlockerPrefs", Context.MODE_PRIVATE)
        sharedPrefs.edit().remove("elapsed_time_schedule_${id}_${currentDate}").apply()
    }

    /** Remove a schedule from persistence. */
    fun removeSchedule(context: Context, id: Int) {
        val prefs = getPrefs(context)
        val schedules = loadAllSchedules(prefs).toMutableList()
        schedules.removeAll { it.getInt("id") == id }
        persistSchedules(prefs, schedules)

        // Clear SharedPreferences progress for this schedule ID as well
        val sharedPrefs = context.getSharedPreferences("HabitBlockerPrefs", Context.MODE_PRIVATE)
        val keysToRemove = sharedPrefs.all.keys.filter { it.startsWith("elapsed_time_schedule_${id}_") }
        if (keysToRemove.isNotEmpty()) {
            val editor = sharedPrefs.edit()
            for (key in keysToRemove) {
                editor.remove(key)
            }
            editor.apply()
        }
    }

    /** Return all persisted schedules. */
    fun getAllSchedules(context: Context): List<JSONObject> {
        return loadAllSchedules(getPrefs(context))
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun loadAllSchedules(prefs: SharedPreferences): List<JSONObject> {
        val json = prefs.getString(KEY_SCHEDULES, "[]") ?: "[]"
        val array = JSONArray(json)
        val list = mutableListOf<JSONObject>()
        for (i in 0 until array.length()) {
            list.add(array.getJSONObject(i))
        }
        return list
    }

    private fun persistSchedules(prefs: SharedPreferences, schedules: List<JSONObject>) {
        val array = JSONArray()
        schedules.forEach { array.put(it) }
        prefs.edit().putString(KEY_SCHEDULES, array.toString()).apply()
    }

    private fun getCurrentDateString(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
        return sdf.format(java.util.Date())
    }
}
