#import <Capacitor/Capacitor.h>

CAP_PLUGIN(MovuHealthKitPlugin, "MovuHealthKit",
           CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(queryHealthData, CAPPluginReturnPromise);
)
