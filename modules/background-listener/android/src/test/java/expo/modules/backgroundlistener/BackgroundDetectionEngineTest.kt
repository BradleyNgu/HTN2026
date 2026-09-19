package expo.modules.backgroundlistener

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BackgroundDetectionEngineTest {
  @Test
  fun `rolling transcript emits 50 words then advances by 20`() {
    val accumulator = TranscriptAccumulator()
    assertNull(accumulator.add(words(1, 49)))
    val first = accumulator.add("word50")
    assertEquals(50, first?.text?.split(" ")?.size)
    assertNull(accumulator.add(words(51, 69)))
    val second = accumulator.add("word70")
    assertEquals(2, second?.id)
    assertTrue(second?.text?.startsWith("word21") == true)
  }

  @Test
  fun `keyword matching respects word boundaries and flexible spaces`() {
    assertEquals("AI", ImmediateKeywords.find("we should discuss AI today"))
    assertEquals("web3", ImmediateKeywords.find("the web 3 proposal"))
    assertEquals(
      "physical intelligence",
      ImmediateKeywords.find("physical   intelligence systems"),
    )
    assertNull(ImmediateKeywords.find("the chair is comfortable"))
    assertNull(ImmediateKeywords.find("blockchainish is not the keyword"))
  }

  @Test
  fun `gate requires two confident positives`() {
    val gate = DetectionGate("medium")
    val positive = ClassificationResult(true, 0.8, "slow")
    assertFalse(gate.apply(1, positive, 1_000))
    assertTrue(gate.apply(2, positive, 2_000))
  }

  @Test
  fun `gate ignores stale response ordering and enforces cooldown`() {
    val gate = DetectionGate("high", cooldownMs = 1_000)
    val positive = ClassificationResult(true, 0.9, "slow")
    assertFalse(gate.apply(2, positive, 1_000))
    assertFalse(gate.apply(1, positive, 1_100))
    assertTrue(gate.apply(3, positive, 1_200))
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
