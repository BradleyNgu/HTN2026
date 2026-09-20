package expo.modules.backgroundlistener

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BackgroundDetectionEngineTest {
  @Test
  fun `rolling transcript emits 10 words then advances by 10`() {
    val accumulator = TranscriptAccumulator()
    assertNull(accumulator.add(words(1, 9)))
    val first = accumulator.add("word10")
    assertEquals(10, first?.text?.split(" ")?.size)
    assertNull(accumulator.add(words(11, 19)))
    val second = accumulator.add("word20")
    assertEquals(2, second?.id)
    assertTrue(second?.text?.startsWith("word11") == true)
  }

  @Test
  fun `keyword matching uses the configured keyword list`() {
    val keywords = listOf("AI", "big data", "web3", "physical intelligence", "blockchain")
    assertEquals("AI", ImmediateKeywords.find("we should discuss AI today", keywords))
    assertEquals("web3", ImmediateKeywords.find("the web3 proposal", keywords))
    assertEquals(
      "physical intelligence",
      ImmediateKeywords.find("physical   intelligence systems", keywords),
    )
    assertNull(ImmediateKeywords.find("the chair is comfortable", keywords))
    assertNull(ImmediateKeywords.find("blockchainish is not the keyword", keywords))
    assertNull(ImmediateKeywords.find("we should discuss blockchain today", listOf("AI")))
  }

  @Test
  fun `gate triggers on one confident positive`() {
    val gate = DetectionGate("medium")
    val positive = ClassificationResult(true, 0.8, "slow")
    assertTrue(gate.apply(1, positive, 1_000))
  }

  @Test
  fun `gate ignores stale response ordering and enforces cooldown`() {
    val gate = DetectionGate("high", cooldownMs = 1_000)
    val positive = ClassificationResult(true, 0.9, "slow")
    assertTrue(gate.apply(2, positive, 1_000))
    assertFalse(gate.apply(1, positive, 1_100))
    assertFalse(gate.apply(3, positive, 1_200))
    assertFalse(gate.triggerImmediately(1_500))
    assertTrue(gate.triggerImmediately(2_201))
  }

  @Test
  fun `service cleanup releases each resource once`() {
    var recognizerStops = 0
    var wakeLockReleases = 0
    var requestCancels = 0
    val cleanup = CleanupCoordinator(
      listOf(
        { recognizerStops += 1 },
        { wakeLockReleases += 1 },
        { requestCancels += 1 },
      ),
    )

    assertTrue(cleanup.run())
    assertFalse(cleanup.run())
    assertEquals(1, recognizerStops)
    assertEquals(1, wakeLockReleases)
    assertEquals(1, requestCancels)
  }

  private fun words(from: Int, through: Int) =
    (from..through).joinToString(" ") { "word$it" }
}
