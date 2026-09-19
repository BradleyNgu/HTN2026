package expo.modules.backgroundlistener

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BackgroundListenerModule : Module() {
  private val eventListener: (String, Map<String, Any?>) -> Unit = { name, body ->
    sendEvent(name, body)
  }

  override fun definition() = ModuleDefinition {
    Name("BackgroundListener")

    Events("onStatus", "onTrigger")

    OnCreate {
      BackgroundListenerEventBus.add(eventListener)
    }

    OnDestroy {
      BackgroundListenerEventBus.remove(eventListener)
    }

    Function("start") { options: BackgroundListenerOptions ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is unavailable")
      if (
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) !=
          PackageManager.PERMISSION_GRANTED
      ) {
        throw IllegalStateException("Microphone permission is required")
      }

      val intent = Intent(context, BackgroundListeningService::class.java).apply {
        action = BackgroundListeningService.ACTION_START
        putExtra(BackgroundListeningService.EXTRA_CALLER_ID, options.callerId)
        putExtra(BackgroundListeningService.EXTRA_CALLER_NAME, options.callerName)
        putExtra(BackgroundListeningService.EXTRA_CALLER_RELATIONSHIP, options.callerRelationship)
        putExtra(BackgroundListeningService.EXTRA_SENSITIVITY, options.sensitivity)
        putExtra(BackgroundListeningService.EXTRA_TRIGGER_DELAY, options.triggerDelaySeconds)
        putExtra(BackgroundListeningService.EXTRA_API_URL, options.apiUrl)
        putExtra(BackgroundListeningService.EXTRA_LOCALE, options.locale)
      }
      ContextCompat.startForegroundService(context, intent)
      BackgroundListenerState.status.toMap()
    }

    Function("stop") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is unavailable")
      context.startService(
        Intent(context, BackgroundListeningService::class.java).apply {
          action = BackgroundListeningService.ACTION_STOP
        },
      )
      true
    }

    Function("getStatus") {
      BackgroundListenerState.status.toMap()
    }

    Function("consumePendingTrigger") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is unavailable")
      val preferences = context.getSharedPreferences(
        BackgroundListeningService.PREFS_NAME,
        android.content.Context.MODE_PRIVATE,
      )
      val callerId = preferences.getString("callerId", null)
      val reason = preferences.getString("reason", null)
      val triggeredAt = preferences.getLong("triggeredAt", 0)
      preferences.edit().clear().apply()
      NotificationManagerCompat.from(context)
        .cancel(BackgroundListeningService.TRIGGER_NOTIFICATION_ID)
      if (callerId == null) {
        null
      } else {
        mapOf(
          "callerId" to callerId,
          "reason" to reason,
          "triggeredAt" to triggeredAt,
        )
      }
    }
  }
}
