package expo.modules.backgroundlistener

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
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
        putExtra(BackgroundListeningService.EXTRA_CALL_TYPE, options.callType)
        putExtra(BackgroundListeningService.EXTRA_PHONE_NUMBER, options.phoneNumber)
        putExtra(BackgroundListeningService.EXTRA_DETECTION_CONTEXT, options.detectionContext)
        putStringArrayListExtra(
          BackgroundListeningService.EXTRA_KEYWORDS,
          ArrayList(
            options.keywords
              .map { it.trim() }
              .filter { it.isNotEmpty() },
          ),
        )
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

    Function("dismissTornadoAlert") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is unavailable")
      context.startService(
        Intent(context, BackgroundListeningService::class.java).apply {
          action = BackgroundListeningService.ACTION_DISMISS_TORNADO
        },
      )
      true
    }

    Function("getStatus") {
      BackgroundListenerState.status.toMap()
    }
  }
}
