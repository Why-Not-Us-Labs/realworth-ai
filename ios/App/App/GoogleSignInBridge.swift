import UIKit
import WebKit
import Capacitor
import GoogleSignIn

class GoogleSignInViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Register JS message handler so the remote web page can trigger native Google Sign-In
        webView?.configuration.userContentController.add(
            self, name: "googleSignIn"
        )

        // Inject flag so web page knows native sign-in is available
        let script = WKUserScript(
            source: "window.nativeGoogleSignIn = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView?.configuration.userContentController.addUserScript(script)
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        if message.name == "googleSignIn" {
            performGoogleSignIn()
        }
    }

    private func performGoogleSignIn() {
        GIDSignIn.sharedInstance.signIn(withPresenting: self) { [weak self] result, error in
            guard let self = self else { return }

            DispatchQueue.main.async {
                print("[GoogleSignIn] signIn callback - error: \(String(describing: error)), hasUser: \(result?.user != nil)")
                if let error = error {
                    let escaped = error.localizedDescription
                        .replacingOccurrences(of: "'", with: "\\'")
                        .replacingOccurrences(of: "\n", with: " ")
                    let js = "window.dispatchEvent(new CustomEvent('googleSignInError', { detail: { error: '\(escaped)' } }));"
                    self.webView?.evaluateJavaScript(js, completionHandler: nil)
                    return
                }

                guard let idToken = result?.user.idToken?.tokenString else {
                    let js = "window.dispatchEvent(new CustomEvent('googleSignInError', { detail: { error: 'No ID token returned' } }));"
                    self.webView?.evaluateJavaScript(js, completionHandler: nil)
                    return
                }

                let js = """
                    console.log('[Native] Got ID token, dispatching event');
                    window.dispatchEvent(new CustomEvent('googleSignInComplete', { detail: { idToken: '\(idToken)' } }));
                """
                self.webView?.evaluateJavaScript(js) { result, error in
                    if let error = error {
                        print("[GoogleSignIn] evaluateJavaScript error: \(error)")
                    } else {
                        print("[GoogleSignIn] evaluateJavaScript success")
                    }
                }
            }
        }
    }
}
