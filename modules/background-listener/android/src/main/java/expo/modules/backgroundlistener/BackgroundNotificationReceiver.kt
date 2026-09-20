package expo.modules.backgroundlistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

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
      ACTION_DISMISS_TORNADO -> {
        context.startService(
          Intent(context, BackgroundListeningService::class.java).apply {
            action = BackgroundListeningService.ACTION_DISMISS_TORNADO
          },
        )
      }
    }
  }

  companion object {
    const val ACTION_STOP = "expo.modules.backgroundlistener.STOP"
    const val ACTION_DISMISS_TORNADO = "expo.modules.backgroundlistener.DISMISS_TORNADO"
  }
}
