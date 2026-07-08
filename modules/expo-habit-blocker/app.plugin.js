const { withAndroidManifest, withGradleProperties } = require("@expo/config-plugins");

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withHabitBlockerPlugin = (config) => {
  // 1. AndroidManifest modifications
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];

    // Ensure uses-permission array exists
    if (!androidManifest["uses-permission"]) {
      androidManifest["uses-permission"] = [];
    }

    // Declare permissions to add
    const permissionsToAdd = [
      { "android:name": "android.permission.SYSTEM_ALERT_WINDOW" },
      { "android:name": "android.permission.FOREGROUND_SERVICE" },
      { "android:name": "android.permission.FOREGROUND_SERVICE_SPECIAL_USE" },
      { 
        "android:name": "android.permission.PACKAGE_USAGE_STATS",
        "tools:ignore": "ProtectedPermissions"
      },
      {
        "android:name": "android.permission.QUERY_ALL_PACKAGES",
        "tools:ignore": "QueryAllPackagesPermission"
      },
      {
        "android:name": "android.permission.SCHEDULE_EXACT_ALARM"
      },
      {
        "android:name": "android.permission.POST_NOTIFICATIONS"
      },
      {
        "android:name": "android.permission.RECEIVE_BOOT_COMPLETED"
      }
    ];

    // Ensure tools namespace is added to the root manifest tag for tools:ignore
    if (!androidManifest.$["xmlns:tools"]) {
      androidManifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    permissionsToAdd.forEach((perm) => {
      const exists = androidManifest["uses-permission"].some(
        (p) => p.$["android:name"] === perm["android:name"]
      );
      if (!exists) {
        androidManifest["uses-permission"].push({ $: perm });
      }
    });

    // Ensure services array exists
    if (!application.service) {
      application.service = [];
    }

    const serviceName = "expo.modules.habitblocker.BlockerService";
    const serviceExists = application.service.some(
      (s) => s.$["android:name"] === serviceName
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          "android:name": serviceName,
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse"
        },
        property: [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value": "habit-blocker"
            }
          }
        ]
      });
    }

    // Ensure receiver array exists
    if (!application.receiver) {
      application.receiver = [];
    }

    const receiverName = "expo.modules.habitblocker.BlockerReceiver";
    const receiverExists = application.receiver.some(
      (r) => r.$["android:name"] === receiverName
    );

    if (!receiverExists) {
      application.receiver.push({
        $: {
          "android:name": receiverName,
          "android:enabled": "true",
          "android:exported": "false"
        }
      });
    }

    // Register BootReceiver for re-scheduling alarms after device reboot
    const bootReceiverName = "expo.modules.habitblocker.BootReceiver";
    const bootReceiverExists = application.receiver.some(
      (r) => r.$["android:name"] === bootReceiverName
    );

    if (!bootReceiverExists) {
      application.receiver.push({
        $: {
          "android:name": bootReceiverName,
          "android:enabled": "true",
          "android:exported": "true"
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.intent.action.BOOT_COMPLETED"
                }
              }
            ]
          }
        ]
      });
    }

    return config;
  });

  // 2. gradle.properties modifications (fixes JDK 22+ prefab bug by forcing JDK 21)
  config = withGradleProperties(config, (config) => {
    const jvmargsIndex = config.modResults.findIndex(item => item.key === 'org.gradle.jvmargs');
    if (jvmargsIndex > -1) {
      config.modResults[jvmargsIndex].value = '-Xmx2048m -XX:MaxMetaspaceSize=512m --enable-native-access=ALL-UNNAMED';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx2048m -XX:MaxMetaspaceSize=512m --enable-native-access=ALL-UNNAMED'
      });
    }

    const javaHomeIndex = config.modResults.findIndex(item => item.key === 'org.gradle.java.home');
    if (javaHomeIndex > -1) {
      config.modResults[javaHomeIndex].value = '/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'org.gradle.java.home',
        value: '/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home'
      });
    }

    return config;
  });

  return config;
};

module.exports = withHabitBlockerPlugin;
