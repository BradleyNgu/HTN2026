package expo.modules.backgroundlistener

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.concurrent.CopyOnWriteArraySet

class BackgroundListenerOptions : Record {
  @Field val callerId: String = ""
  @Field val callerName: String = "Caller"
  @Field val callerRelationship: String = "Audio call"
  @Field val sensitivity: String = "medium"
  @Field val triggerDelaySeconds: Int = 0
  @Field val apiUrl: String = ""
  @Field val locale: String = "en-US"
  @Field val callType: String? = null
  @Field val keywords: List<String> = emptyList()
}

data class ServiceConfig(
  val callerId: String,
  val callerName: String,
  val callerRelationship: String,
  val sensitivity: String,
  val triggerDelaySeconds: Int,
  val apiUrl: String,
  val locale: String,
  val callType: String?,
  val keywords: List<String>,
)

data class ListenerStatus(
  val active: Boolean = false,
  val phase: String = "idle",
  val startedAt: Long = 0,
  val wordsHeard: Int = 0,
  val recentText: String = "",
  val lastError: String? = null,
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "active" to active,
    "phase" to phase,
    "startedAt" to startedAt,
    "wordsHeard" to wordsHeard,
    "recentText" to recentText,
    "lastError" to lastError,
  )
}

object BackgroundListenerState {
  @Volatile var status = ListenerStatus()

  fun update(next: ListenerStatus) {
    status = next
    BackgroundListenerEventBus.emit("onStatus", next.toMap())
  }
}

object BackgroundListenerEventBus {
  private val listeners = CopyOnWriteArraySet<(String, Map<String, Any?>) -> Unit>()

  fun add(listener: (String, Map<String, Any?>) -> Unit) {
    listeners.add(listener)
  }

  fun remove(listener: (String, Map<String, Any?>) -> Unit) {
    listeners.remove(listener)
  }

  fun emit(name: String, body: Map<String, Any?>) {
    listeners.forEach { listener -> listener(name, body) }
  }
}
