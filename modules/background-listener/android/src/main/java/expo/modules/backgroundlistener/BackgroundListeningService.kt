package expo.modules.backgroundlistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.speech.RecognitionListener
import android.speech.RecognitionService
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class BackgroundListeningService : Service(), RecognitionListener {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val transcript = TranscriptAccumulator()
  private var recognizer: SpeechRecognizer? = null
  private var recognitionIntent: Intent? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var classifierExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private var config: ServiceConfig? = null
  private var gate = DetectionGate("medium")
  private var previousPartial = ""
  private var usingOfflineRecognizer = false
  private var stopping = false
  private var triggered = false
  private var restartAttempts = 0
  private var startedAt = 0L
  private var wordsHeard = 0
  private var triggerDelayElapsed = false
  private var callRequestFinished = true
  private var alertPlayer: MediaPlayer? = null
  private val cleanup = CleanupCoordinator(
    listOf(
      { mainHandler.removeCallbacksAndMessages(null) },
      { stopRecognizer() },
      { stopTornadoAlert() },
      { transcript.clear() },
      { releaseWakeLock() },
      { classifierExecutor.shutdownNow() },
    ),
  )

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    startForeground(LISTENING_NOTIFICATION_ID, listeningNotification())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopListening()
      return START_NOT_STICKY
    }
    if (intent?.action == ACTION_DISMISS_TORNADO) {
      finishTornadoAlert()
      return START_NOT_STICKY
    }
    if (intent?.action != ACTION_START) return START_NOT_STICKY

    config = ServiceConfig(
      callerId = intent.getStringExtra(EXTRA_CALLER_ID).orEmpty(),
      callerName = intent.getStringExtra(EXTRA_CALLER_NAME).orEmpty().ifBlank { "Caller" },
      callerRelationship = intent.getStringExtra(EXTRA_CALLER_RELATIONSHIP).orEmpty()
        .ifBlank { "Audio call" },
      sensitivity = intent.getStringExtra(EXTRA_SENSITIVITY).orEmpty().ifBlank { "medium" },
      triggerDelaySeconds = intent.getIntExtra(EXTRA_TRIGGER_DELAY, 0).coerceIn(0, 60),
      apiUrl = intent.getStringExtra(EXTRA_API_URL).orEmpty(),
      locale = intent.getStringExtra(EXTRA_LOCALE).orEmpty().ifBlank { "en-US" },
      callType = intent.getStringExtra(EXTRA_CALL_TYPE)
        ?.takeIf { it in setOf("mom", "boss", "girlfriend") },
      localAlert = intent.getStringExtra(EXTRA_LOCAL_ALERT)
        ?.takeIf { it == "tornado" },
      phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER).orEmpty().trim(),
      detectionContext = intent.getStringExtra(EXTRA_DETECTION_CONTEXT).orEmpty().trim(),
      keywords = intent.getStringArrayListExtra(EXTRA_KEYWORDS)
        ?.map { it.trim() }
        ?.filter { it.isNotEmpty() }
        .orEmpty(),
    )
    gate = DetectionGate(config!!.sensitivity)
    stopping = false
    triggered = false
    startedAt = System.currentTimeMillis()
    wordsHeard = 0
    triggerDelayElapsed = false
    callRequestFinished = true
    acquireWakeLock()
    updateStatus(true, "starting")
    createRecognizer(preferOffline = true)
    startRecognition()
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onReadyForSpeech(params: Bundle?) {
    restartAttempts = 0
    updateStatus(true, "listening")
  }

  override fun onBeginningOfSpeech() = Unit
  override fun onRmsChanged(rmsdB: Float) = Unit
  override fun onBufferReceived(buffer: ByteArray?) = Unit
  override fun onEndOfSpeech() = Unit
  override fun onEvent(eventType: Int, params: Bundle?) = Unit

  override fun onPartialResults(partialResults: Bundle?) {
    val text = partialResults
      ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
      ?.firstOrNull()
      .orEmpty()
    processRecognitionText(text, isFinal = false)
  }

  override fun onResults(results: Bundle?) {
    val text = results
      ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
      ?.firstOrNull()
      .orEmpty()
    processRecognitionText(text, isFinal = true)
    scheduleRestart(250)
  }

  override fun onError(error: Int) {
    if (stopping || triggered) return
    if (
      usingOfflineRecognizer &&
      error in setOf(
        SpeechRecognizer.ERROR_CLIENT,
        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED,
        SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE,
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
        SpeechRecognizer.ERROR_SERVER,
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
        SpeechRecognizer.ERROR_NO_MATCH,
      )
    ) {
      createRecognizer(preferOffline = false)
      scheduleRestart(300)
      return
    }
    if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
      updateStatus(false, "error", "Microphone permission was revoked")
      stopListening()
      return
    }

    val delay = (400L shl restartAttempts.coerceAtMost(4)).coerceAtMost(6_000)
    restartAttempts = (restartAttempts + 1).coerceAtMost(5)
    updateStatus(true, "reconnecting", "Speech recognizer error $error")
    scheduleRestart(delay)
  }

  private fun processRecognitionText(text: String, isFinal: Boolean) {
    if (text.isBlank() || stopping || triggered) return
    val delta = TranscriptAccumulator.delta(previousPartial, text)
    previousPartial = if (isFinal) "" else text
    if (delta.isBlank()) return

    wordsHeard += delta.trim().split(Regex("\\s+")).size
    val window = transcript.add(delta)
    updateStatus(true, "listening")
    val keyword = ImmediateKeywords.find(
      transcript.recentText(),
      config?.keywords.orEmpty(),
    )
    if (keyword != null && gate.triggerImmediately()) {
      trigger("Detected “$keyword” locally")
      return
    }
    if (window != null) classify(window)
  }

  private fun classify(window: TranscriptWindow) {
    val serviceConfig = config ?: return
    if (serviceConfig.apiUrl.isBlank() || classifierExecutor.isShutdown) return
    updateStatus(true, "evaluating")
    classifierExecutor.execute {
      try {
        val result = classifyWithRetry(
          ClassificationClient(serviceConfig.apiUrl),
          window,
          serviceConfig.keywords,
          serviceConfig.detectionContext,
        )
        mainHandler.post {
          if (!stopping && !triggered) {
            if (gate.apply(window.id, result)) {
              trigger(result.reason)
            } else {
              updateStatus(true, "listening")
            }
          }
        }
      } catch (error: Exception) {
        mainHandler.post {
          if (!stopping && !triggered) {
            updateStatus(true, "listening", "Classifier temporarily unavailable")
          }
        }
      }
    }
  }

  private fun classifyWithRetry(
    client: ClassificationClient,
    window: TranscriptWindow,
    keywords: List<String>,
    detectionContext: String,
  ): ClassificationResult {
    var lastError: Exception? = null
    repeat(2) { attempt ->
      if (attempt > 0) TimeUnit.MILLISECONDS.sleep(1_000)
      try {
        return client.classify(window, keywords, detectionContext)
      } catch (error: Exception) {
        lastError = error
      }
    }
    throw lastError ?: IllegalStateException("Classification failed")
  }

  private fun trigger(reason: String) {
    if (triggered || stopping) return
    triggered = true
    stopRecognizer()
    releaseWakeLock()
    transcript.clear()
    updateStatus(false, "triggered")
    val serviceConfig = config ?: return stopListening()
    // Wait for either the Twilio request or tornado dismiss before stopping.
    callRequestFinished = false
    triggerDelayElapsed = false
    BackgroundListenerEventBus.emit(
      "onTrigger",
      mapOf(
        "callerId" to serviceConfig.callerId,
        "callerName" to serviceConfig.callerName,
        "reason" to reason,
        "alertType" to (
          serviceConfig.callType
            ?: serviceConfig.localAlert
            ?: "tornado"
          ),
      ),
    )
    val delayMs = serviceConfig.triggerDelaySeconds * 1_000L
    mainHandler.postDelayed({
      triggerDelayElapsed = true
      val callType = serviceConfig.callType
      if (callType != null) {
        requestPhoneCall(serviceConfig, callType)
      } else {
        presentTornadoAlert()
      }
      finishTriggeredServiceIfReady()
    }, delayMs)
  }

  private fun presentTornadoAlert() {
    stopTornadoAlert()
    try {
      val player = MediaPlayer()
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      resources.openRawResourceFd(R.raw.alert).use { asset ->
        player.setDataSource(asset.fileDescriptor, asset.startOffset, asset.length)
      }
      player.isLooping = true
      player.setVolume(1f, 1f)
      player.prepare()
      player.start()
      alertPlayer = player
    } catch (_: Exception) {
      // Fall through to the emergency notification even if audio fails.
    }
    NotificationManagerCompat.from(this)
      .notify(TORNADO_NOTIFICATION_ID, tornadoNotification())
    acquireWakeLock()
  }

  private fun stopTornadoAlert() {
    try {
      alertPlayer?.stop()
    } catch (_: RuntimeException) {
      // Player may already be stopped.
    }
    alertPlayer?.release()
    alertPlayer = null
    NotificationManagerCompat.from(this).cancel(TORNADO_NOTIFICATION_ID)
  }

  private fun finishTornadoAlert() {
    stopTornadoAlert()
    releaseWakeLock()
    callRequestFinished = true
    triggerDelayElapsed = true
    finishTriggeredServiceIfReady()
  }

  private fun requestPhoneCall(serviceConfig: ServiceConfig, callType: String) {
    classifierExecutor.execute {
      try {
        ClassificationClient(serviceConfig.apiUrl)
          .triggerCall(callType, serviceConfig.phoneNumber)
      } catch (error: Exception) {
        mainHandler.post {
          updateStatus(
            false,
            "error",
            "Phone call failed: ${error.message ?: "network request failed"}",
          )
        }
      } finally {
        mainHandler.post {
          callRequestFinished = true
          finishTriggeredServiceIfReady()
        }
      }
    }
  }

  private fun finishTriggeredServiceIfReady() {
    if (!triggerDelayElapsed || !callRequestFinished) return
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun createRecognizer(preferOffline: Boolean) {
    stopRecognizer()
    usingOfflineRecognizer =
      preferOffline &&
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
    recognizer = when {
      usingOfflineRecognizer -> SpeechRecognizer.createOnDeviceSpeechRecognizer(this)
      findGoogleRecognitionComponent() != null ->
        SpeechRecognizer.createSpeechRecognizer(this, findGoogleRecognitionComponent())
      else -> SpeechRecognizer.createSpeechRecognizer(this)
    }.also { it.setRecognitionListener(this) }

    val serviceConfig = config ?: return
    recognitionIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, serviceConfig.locale)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, serviceConfig.locale)
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
      putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, usingOfflineRecognizer)
      putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1_500L)
      putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 800L)
    }
  }

  private fun startRecognition() {
    if (stopping || triggered) return
    try {
      recognizer?.startListening(recognitionIntent)
    } catch (_: RuntimeException) {
      scheduleRestart(1_000)
    }
  }

  private fun scheduleRestart(delayMs: Long) {
    if (stopping || triggered) return
    mainHandler.removeCallbacks(restartRunnable)
    mainHandler.postDelayed(restartRunnable, delayMs)
  }

  private val restartRunnable = Runnable {
    if (!stopping && !triggered) {
      try {
        recognizer?.cancel()
      } catch (_: RuntimeException) {
        // The recognizer may already be disconnected.
      }
      startRecognition()
    }
  }

  private fun findGoogleRecognitionComponent(): ComponentName? {
    val services = packageManager.queryIntentServices(
      Intent(RecognitionService.SERVICE_INTERFACE),
      PackageManager.MATCH_DEFAULT_ONLY,
    )
    val google = services.firstOrNull {
      it.serviceInfo.packageName == "com.google.android.googlequicksearchbox"
    } ?: return null
    return ComponentName(google.serviceInfo.packageName, google.serviceInfo.name)
  }

  private fun stopListening() {
    if (stopping) return
    stopping = true
    cleanup.run()
    BackgroundListenerState.update(ListenerStatus())
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun stopRecognizer() {
    mainHandler.removeCallbacks(restartRunnable)
    try {
      recognizer?.cancel()
      recognizer?.destroy()
    } catch (_: RuntimeException) {
      // Cleanup must continue even if the recognition provider has disconnected.
    }
    recognizer = null
    previousPartial = ""
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "$packageName:background-listening",
    ).apply {
      setReferenceCounted(false)
      acquire()
    }
  }

  private fun releaseWakeLock() {
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
  }

  private fun updateStatus(active: Boolean, phase: String, error: String? = null) {
    BackgroundListenerState.update(
      ListenerStatus(
        active = active,
        phase = phase,
        startedAt = if (active) startedAt else 0,
        wordsHeard = wordsHeard,
        recentText = if (active) transcript.recentText() else "",
        lastError = error,
      ),
    )
    if (active) {
      NotificationManagerCompat.from(this)
        .notify(LISTENING_NOTIFICATION_ID, listeningNotification())
    }
  }

  private fun createNotificationChannels() {
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(
      NotificationChannel(
        LISTENING_CHANNEL_ID,
        "Background listening",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Shown while TalkBlock uses the microphone"
        setSound(null, null)
        enableVibration(false)
      },
    )
    manager.createNotificationChannel(
      NotificationChannel(
        TORNADO_CHANNEL_ID,
        "Emergency alerts",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Tornado warning alerts from TalkBlock"
        enableVibration(true)
        setBypassDnd(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      },
    )
  }

  private fun listeningNotification(): Notification {
    val openIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(Intent.ACTION_VIEW, Uri.parse("conversationescape://"))
    val openPendingIntent = PendingIntent.getActivity(
      this,
      10,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val stopPendingIntent = PendingIntent.getBroadcast(
      this,
      11,
      Intent(this, BackgroundNotificationReceiver::class.java).apply {
        action = BackgroundNotificationReceiver.ACTION_STOP
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val phase = BackgroundListenerState.status.phase
    return NotificationCompat.Builder(this, LISTENING_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("TalkBlock is listening")
      .setContentText(if (phase == "evaluating") "Checking the latest conversation…" else "Tap to open, or stop at any time")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setContentIntent(openPendingIntent)
      .addAction(0, "Open", openPendingIntent)
      .addAction(0, "Stop", stopPendingIntent)
      .build()
  }

  private fun tornadoNotification(): Notification {
    val openIntent = (packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(Intent.ACTION_VIEW, Uri.parse("conversationescape://listening")))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val openPendingIntent = PendingIntent.getActivity(
      this,
      20,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val dismissPendingIntent = PendingIntent.getBroadcast(
      this,
      21,
      Intent(this, BackgroundNotificationReceiver::class.java).apply {
        action = BackgroundNotificationReceiver.ACTION_DISMISS_TORNADO
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, TORNADO_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Emergency Alert")
      .setContentText("Severe weather (Tornado warning)")
      .setStyle(
        NotificationCompat.BigTextStyle().bigText(
          "A tornado warning has been issued for your area. Seek shelter immediately.",
        ),
      )
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(openPendingIntent)
      .setFullScreenIntent(openPendingIntent, true)
      .addAction(0, "Open", openPendingIntent)
      .addAction(0, "OK", dismissPendingIntent)
      .build()
  }

  override fun onDestroy() {
    cleanup.run()
    if (BackgroundListenerState.status.active) {
      BackgroundListenerState.update(ListenerStatus())
    }
    super.onDestroy()
  }

  companion object {
    const val ACTION_START = "expo.modules.backgroundlistener.START"
    const val ACTION_STOP = "expo.modules.backgroundlistener.STOP_SERVICE"
    const val ACTION_DISMISS_TORNADO = "expo.modules.backgroundlistener.DISMISS_TORNADO"
    const val EXTRA_CALLER_ID = "callerId"
    const val EXTRA_CALLER_NAME = "callerName"
    const val EXTRA_CALLER_RELATIONSHIP = "callerRelationship"
    const val EXTRA_SENSITIVITY = "sensitivity"
    const val EXTRA_TRIGGER_DELAY = "triggerDelaySeconds"
    const val EXTRA_API_URL = "apiUrl"
    const val EXTRA_LOCALE = "locale"
    const val EXTRA_CALL_TYPE = "callType"
    const val EXTRA_LOCAL_ALERT = "localAlert"
    const val EXTRA_PHONE_NUMBER = "phoneNumber"
    const val EXTRA_DETECTION_CONTEXT = "detectionContext"
    const val EXTRA_KEYWORDS = "keywords"

    const val LISTENING_NOTIFICATION_ID = 7401
    const val TORNADO_NOTIFICATION_ID = 7402
    private const val LISTENING_CHANNEL_ID = "background-listening"
    private const val TORNADO_CHANNEL_ID = "tornado-emergency-alert"
  }
}
