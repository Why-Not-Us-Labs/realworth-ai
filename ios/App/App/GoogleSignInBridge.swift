import UIKit
import WebKit
import Capacitor
import GoogleSignIn

class GoogleSignInViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Register JS message handler so the remote web page can trigger native Google Sign-In
        webView?.configuration.userContentController.addScriptMessageHandler(
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

                let js = "window.dispatchEvent(new CustomEvent('googleSignInComplete', { detail: { idToken: '\(idToken)' } }));"
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }
}
