package expo.modules.backgroundlistener

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ClassificationClient(private val apiUrl: String) {
  fun classify(window: TranscriptWindow): ClassificationResult {
    require(apiUrl.startsWith("https://") || apiUrl.startsWith("http://")) {
      "A valid classifier URL is required"
    }

    val connection = URL("${apiUrl.trimEnd('/')}/classify").openConnection() as HttpURLConnection
    try {
      connection.requestMethod = "POST"
      connection.connectTimeout = 12_000
      connection.readTimeout = 20_000
      connection.doOutput = true
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("Accept", "application/json")
      connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
        writer.write(
          JSONObject()
            .put("windowId", window.id)
            .put("text", window.text)
            .toString(),
        )
      }

      if (connection.responseCode !in 200..299) {
        throw IllegalStateException("Classifier returned HTTP ${connection.responseCode}")
      }

      val response = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
      val json = JSONObject(response)
      if (json.getInt("windowId") != window.id) {
        throw IllegalStateException("Classifier returned a stale response")
      }
      return ClassificationResult(
        boring = json.getBoolean("boring"),
        confidence = json.getDouble("confidence"),
        reason = json.getString("reason").take(160),
      )
    } finally {
      connection.disconnect()
    }
  }

  fun triggerCall(callType: String) {
    require(callType in setOf("mom", "boss", "girlfriend")) {
      "A supported call type is required"
    }
    val connection = URL("${apiUrl.trimEnd('/')}/call").openConnection() as HttpURLConnection
    try {
      connection.requestMethod = "POST"
      connection.connectTimeout = 12_000
      connection.readTimeout = 20_000
      connection.doOutput = true
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("Accept", "application/json")
      connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
        writer.write(JSONObject().put("callType", callType).toString())
      }
      if (connection.responseCode !in 200..299) {
        throw IllegalStateException("Call endpoint returned HTTP ${connection.responseCode}")
      }
    } finally {
      connection.disconnect()
    }
  }
}
