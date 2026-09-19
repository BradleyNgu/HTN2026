package expo.modules.backgroundlistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

class BackgroundNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_STOP -> {
        context.startService(
          Intent(context, BackgroundListeningService::class.java).apply {
            action = BackgroundListeningService.ACTION_STOP
          },
        )
      }
      ACTION_DISMISS_TRIGGER -> {
        NotificationManagerCompat.from(context)
          .cancel(BackgroundListeningService.TRIGGER_NOTIFICATION_ID)
      }
    }
  }

  companion object {
    const val ACTION_STOP = "expo.modules.backgroundlistener.STOP"
    const val ACTION_DISMISS_TRIGGER = "expo.modules.backgroundlistener.DISMISS_TRIGGER"
  }
}
