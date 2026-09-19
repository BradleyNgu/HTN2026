import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { ManagedAudio } from "@/types";
import { isSupportedMp3 } from "./callAudio";

const MAX_MP3_BYTES = 25 * 1024 * 1024;
const audioDirectory = Platform.OS === "web"
  ? null
  : new Directory(Paths.document, "caller-audio");

export async function pickAndStoreMp3(
  callerId: string,
): Promise<ManagedAudio | null> {
  if (!audioDirectory) {
    throw new Error("MP3 caller audio is available in the mobile app only.");
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: ["audio/mpeg", "audio/mp3"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset || !isSupportedMp3(asset.name, asset.mimeType)) {
    throw new Error("Choose an MP3 audio file.");
  }
  if (asset.size && asset.size > MAX_MP3_BYTES) {
    throw new Error("MP3 files must be 25 MB or smaller.");
  }

  audioDirectory.create({ idempotent: true, intermediates: true });
  const safeCallerId = callerId.replace(/[^a-zA-Z0-9_-]/g, "");
  const destination = new File(
    audioDirectory,
    `${safeCallerId}-${Date.now()}.mp3`,
  );
  await new File(asset.uri).copy(destination);

  return {
    uri: destination.uri,
    fileName: asset.name,
    size: asset.size,
  };
}

export function managedAudioExists(audio: ManagedAudio | null) {
  if (!audioDirectory || !audio || !audio.uri.startsWith(audioDirectory.uri)) {
    return false;
  }
  try {
    return new File(audio.uri).exists;
  } catch {
    return false;
  }
}

export function deleteManagedAudio(audio: ManagedAudio | null) {
  if (!audioDirectory || !audio || !audio.uri.startsWith(audioDirectory.uri)) {
    return;
  }
  try {
    const file = new File(audio.uri);
    if (file.exists) file.delete();
  } catch {
    // Cleanup is best-effort and must not invalidate already-saved settings.
  }
}
