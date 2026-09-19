package expo.modules.backgroundlistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BackgroundNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_STOP) return
    context.startService(
      Intent(context, BackgroundListeningService::class.java).apply {
        action = BackgroundListeningService.ACTION_STOP
      },
    )
  }

  companion object {
    const val ACTION_STOP = "expo.modules.backgroundlistener.STOP"
  }
}
