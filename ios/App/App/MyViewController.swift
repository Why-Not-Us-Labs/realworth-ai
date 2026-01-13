import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        // Register our custom StoreKit plugin
        if #available(iOS 15.0, *) {
            bridge?.registerPluginInstance(StoreKitPlugin())
            print("[MyViewController] StoreKitPlugin registered with bridge")
        } else {
            print("[MyViewController] StoreKit requires iOS 15+, skipping registration")
        }
    }
}
