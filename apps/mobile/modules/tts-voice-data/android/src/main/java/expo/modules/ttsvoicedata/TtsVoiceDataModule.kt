package expo.modules.ttsvoicedata

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.speech.tts.TextToSpeech
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

private const val STATUS_AVAILABLE = "available"
private const val STATUS_MISSING_DATA = "missingData"
private const val STATUS_NOT_SUPPORTED = "notSupported"
private const val STATUS_NO_ENGINE = "noEngine"

/** Intent of the settings screen listing text-to-speech engines (fallback when the engine has no installer). */
private const val ACTION_TTS_SETTINGS = "com.android.settings.TTS_SETTINGS"

/**
 * Whether the device's default text-to-speech engine can speak a language, and a shortcut to the
 * engine's own voice download screen. expo-speech exposes neither: its voice list also contains
 * voices that are not downloaded, and it silently falls back to the device language.
 */
class TtsVoiceDataModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TtsVoiceData")

    /** Resolves "available" | "missingData" | "notSupported" | "noEngine" for a BCP-47 tag such as "it". */
    AsyncFunction("getLanguageStatus") { languageTag: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      queryLanguageStatus(context, Locale.forLanguageTag(languageTag), promise)
    }

    /** Opens the engine's voice download screen (or TTS settings). Resolves false if neither exists. */
    AsyncFunction("openVoiceDataInstaller") {
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      startIfPresent(activity, Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA)) ||
        startIfPresent(activity, Intent(ACTION_TTS_SETTINGS))
    }.runOnQueue(Queues.MAIN)
  }

  /** A short-lived engine instance, so the answer reflects voices installed since the app started. */
  private fun queryLanguageStatus(context: Context, locale: Locale, promise: Promise) {
    val lock = Any()
    var engine: TextToSpeech? = null
    var earlyStatus: Int? = null

    fun finish(tts: TextToSpeech, initStatus: Int) {
      val result = if (initStatus == TextToSpeech.SUCCESS) evaluate(tts, locale) else STATUS_NO_ENGINE
      tts.shutdown()
      promise.resolve(result)
    }

    // Without any engine, onInit runs inside the constructor, before `engine` is assigned.
    val created = TextToSpeech(context) { initStatus ->
      synchronized(lock) {
        val tts = engine
        if (tts == null) earlyStatus = initStatus else finish(tts, initStatus)
      }
    }
    synchronized(lock) {
      engine = created
      earlyStatus?.let { finish(created, it) }
    }
  }

  private fun evaluate(tts: TextToSpeech, locale: Locale): String {
    when (tts.isLanguageAvailable(locale)) {
      TextToSpeech.LANG_NOT_SUPPORTED -> return STATUS_NOT_SUPPORTED
      TextToSpeech.LANG_MISSING_DATA -> return STATUS_MISSING_DATA
    }
    // Some engines report a language as available while every voice for it is still to be downloaded.
    val voices = tts.voices ?: return STATUS_AVAILABLE
    val installed = voices.any { voice ->
      voice.locale.language == locale.language &&
        !voice.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
    }
    return if (installed) STATUS_AVAILABLE else STATUS_MISSING_DATA
  }

  private fun startIfPresent(activity: Activity, intent: Intent): Boolean =
    try {
      activity.startActivity(intent)
      true
    } catch (_: ActivityNotFoundException) {
      false
    }
}
