package expo.modules.habitblocker

import android.app.AlarmManager
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HabitBlockerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context not available")

  override fun definition() = ModuleDefinition {
    Name("HabitBlocker")

    Function("isOverlayPermissionGranted") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }
    }

    Function("requestOverlayPermission") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}")
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }

    Function("isUsageStatsPermissionGranted") {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.packageName
        )
      }
      mode == AppOpsManager.MODE_ALLOWED
    }

    Function("requestUsageStatsPermission") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    Function("isAlarmPermissionGranted") {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        alarmManager.canScheduleExactAlarms()
      } else {
        true
      }
    }

    Function("requestAlarmPermission") {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (!alarmManager.canScheduleExactAlarms()) {
          val intent = Intent(
            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
            Uri.parse("package:${context.packageName}")
          ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context.startActivity(intent)
        }
      }
    }

    Function("startBlockService") { targetPackageName: String, durationSeconds: Int, isTest: Boolean ->
      val serviceIntent = Intent(context, BlockerService::class.java).apply {
        putExtra("targetPackageName", targetPackageName)
        putExtra("durationSeconds", durationSeconds)
        putExtra("isTest", isTest)
      }
      try {
        ContextCompat.startForegroundService(context, serviceIntent)
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }

    Function("stopBlockService") {
      val serviceIntent = Intent(context, BlockerService::class.java)
      context.stopService(serviceIntent)
    }

    Function("scheduleDailyBlock") { id: Int, hour: Int, minute: Int, targetPackage: String, durationSeconds: Int ->
      AlarmScheduler.scheduleAlarm(context, id, hour, minute, targetPackage, durationSeconds)
      AlarmScheduler.saveSchedule(context, id, hour, minute, targetPackage, durationSeconds)
    }

    Function("cancelDailyBlock") { id: Int ->
      AlarmScheduler.cancelAlarm(context, id)
      AlarmScheduler.removeSchedule(context, id)
    }

    Function("getInstalledApps") {
      val pm = context.packageManager
      val apps = pm.getInstalledPackages(0)
      val result = mutableListOf<Map<String, String>>()
      for (pkg in apps) {
        val launchIntent = pm.getLaunchIntentForPackage(pkg.packageName)
        if (launchIntent != null) {
          val label = pkg.applicationInfo?.loadLabel(pm)?.toString() ?: pkg.packageName
          result.add(mapOf("packageName" to pkg.packageName, "label" to label))
        }
      }
      result.sortBy { it["label"]?.lowercase() }
      result
    }
  }
}
