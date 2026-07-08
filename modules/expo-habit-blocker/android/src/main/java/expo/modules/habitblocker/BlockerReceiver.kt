package expo.modules.habitblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BlockerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val targetPackageName = intent.getStringExtra("targetPackageName") ?: return
        val durationSeconds = intent.getIntExtra("durationSeconds", 900)

        val serviceIntent = Intent(context, BlockerService::class.java).apply {
            putExtra("targetPackageName", targetPackageName)
            putExtra("durationSeconds", durationSeconds)
            putExtra("isTest", false)
        }

        try {
            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
