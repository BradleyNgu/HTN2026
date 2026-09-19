package expo.modules.backgroundlistener

import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

data class TranscriptWindow(
  val id: Int,
  val text: String,
)

class TranscriptAccumulator(
  private val windowSize: Int = 50,
  private val stride: Int = 20,
  private val maxWords: Int = 120,
) {
  private val words = mutableListOf<String>()
  private var wordsAtLastWindow = 0
  private var sequence = 0

  fun add(text: String): TranscriptWindow? {
    val incoming = text.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    if (incoming.isEmpty()) return null
    words.addAll(incoming)

    if (words.size > maxWords) {
      val removed = words.size - maxWords
      repeat(removed) { words.removeAt(0) }
      wordsAtLastWindow = (wordsAtLastWindow - removed).coerceAtLeast(0)
    }

    if (words.size < windowSize || words.size - wordsAtLastWindow < stride) {
      return null
    }

    wordsAtLastWindow = words.size
    sequence += 1
    return TranscriptWindow(sequence, words.takeLast(windowSize).joinToString(" "))
  }

  fun recentText(max: Int = 24): String = words.takeLast(max).joinToString(" ")

  fun clear() {
    words.clear()
    wordsAtLastWindow = 0
    sequence = 0
  }

  companion object {
    fun delta(previous: String, next: String): String {
      val oldWords = previous.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
      val nextWords = next.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
      var shared = 0
      while (
        shared < oldWords.size &&
        shared < nextWords.size &&
        oldWords[shared].equals(nextWords[shared], ignoreCase = true)
      ) {
        shared += 1
      }
      if (shared == oldWords.size) return nextWords.drop(shared).joinToString(" ")
      if (nextWords.size < oldWords.size / 2.0) return nextWords.joinToString(" ")
      return ""
    }
  }
}

object ImmediateKeywords {
  private val triggers = listOf(
    "physical intelligence" to Regex("\\bphysical\\s+intelligence\\b", RegexOption.IGNORE_CASE),
    "big data" to Regex("\\bbig\\s+data\\b", RegexOption.IGNORE_CASE),
    "blockchain" to Regex("\\bblockchain\\b", RegexOption.IGNORE_CASE),
    "web3" to Regex("\\bweb\\s*3\\b", RegexOption.IGNORE_CASE),
    "AI" to Regex("\\bai\\b", RegexOption.IGNORE_CASE),
  )

  fun find(text: String): String? = triggers.firstOrNull { it.second.containsMatchIn(text) }?.first
}

data class ClassificationResult(
  val boring: Boolean,
  val confidence: Double,
  val reason: String,
)

class DetectionGate(
  sensitivity: String,
  private val requiredPositives: Int = 2,
  private val cooldownMs: Long = 120_000,
) {
  private val threshold = when (sensitivity.lowercase(Locale.US)) {
    "low" -> 0.85
    "high" -> 0.65
    else -> 0.75
  }
  private var positives = 0
  private var latestWindowId = 0
  private var cooldownUntil = 0L

  fun apply(windowId: Int, result: ClassificationResult, now: Long = System.currentTimeMillis()): Boolean {
    if (windowId <= latestWindowId || now < cooldownUntil) return false
    latestWindowId = windowId
    positives = if (result.boring && result.confidence >= threshold) positives + 1 else 0
    if (positives < requiredPositives) return false
    cooldownUntil = now + cooldownMs
    positives = 0
    return true
  }

  fun triggerImmediately(now: Long = System.currentTimeMillis()): Boolean {
    if (now < cooldownUntil) return false
    cooldownUntil = now + cooldownMs
    positives = 0
    return true
  }
}

class CleanupCoordinator(private val actions: List<() -> Unit>) {
  private val completed = AtomicBoolean(false)

  fun run(): Boolean {
    if (!completed.compareAndSet(false, true)) return false
    actions.forEach { it() }
    return true
  }
}
