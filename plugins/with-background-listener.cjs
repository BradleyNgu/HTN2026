const { withAndroidManifest } = require("@expo/config-plugins");

const permissions = [
  "android.permission.RECORD_AUDIO",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  "android.permission.WAKE_LOCK",
  "android.permission.VIBRATE",
];

module.exports = function withBackgroundListener(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const manifest = nextConfig.modResults.manifest;
    manifest["uses-permission"] = manifest["uses-permission"] || [];
    const existingPermissions = new Set(
      manifest["uses-permission"].map((entry) => entry.$["android:name"]),
    );
    for (const permission of permissions) {
      if (!existingPermissions.has(permission)) {
        manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    }

    const application = manifest.application[0];
    application.service = application.service || [];
    const serviceName =
      "expo.modules.backgroundlistener.BackgroundListeningService";
    if (
      !application.service.some(
        (entry) => entry.$["android:name"] === serviceName,
      )
    ) {
      application.service.push({
        $: {
          "android:name": serviceName,
          "android:exported": "false",
          "android:foregroundServiceType": "microphone",
          "android:stopWithTask": "false",
        },
      });
    }

    application.receiver = application.receiver || [];
    const receiverName =
      "expo.modules.backgroundlistener.BackgroundNotificationReceiver";
    if (
      !application.receiver.some(
        (entry) => entry.$["android:name"] === receiverName,
      )
    ) {
      application.receiver.push({
        $: {
          "android:name": receiverName,
          "android:exported": "false",
        },
      });
    }

    return nextConfig;
  });
};
