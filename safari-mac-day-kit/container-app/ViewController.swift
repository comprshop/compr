import WebKit
import Foundation

#if os(iOS)
import UIKit
import SafariServices
import AuthenticationServices
import CryptoKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "nl.getcompr.compr.extension"
let containerLanguage = (Locale.current.region?.identifier == "NL" || TimeZone.current.identifier == "Europe/Amsterdam") ? "nl" : "en"
let comprAppleSignInRequested = Notification.Name("comprAppleSignInRequested")

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {
    @IBOutlet var webView: WKWebView!
#if os(iOS)
    private var appleSignInCoordinator: AppleSignInCoordinator?
    private var nativeAppleSignInButton: ASAuthorizationAppleIDButton?
#endif

    override func viewDidLoad() {
        super.viewDidLoad()
#if DEBUG && os(iOS)
        exposeSandboxProductDiagnostics()
#endif
        NotificationCenter.default.addObserver(self, selector: #selector(handleAppleSignInRequest), name: comprAppleSignInRequested, object: nil)
        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")
        webView.loadFileURL(
            Bundle.main.url(forResource: "Main", withExtension: "html")!,
            allowingReadAccessTo: Bundle.main.resourceURL!
        )
#if os(iOS)
        installNativeAppleSignInButton()
#endif
    }

#if DEBUG && os(iOS)
    private func exposeSandboxProductDiagnostics() {
        guard ComprNativeAuthConfig.projectRef == "uhvukecryuvosuascics",
              let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: "group.nl.getcompr.compr"
              ) else { return }

        let source = container.appendingPathComponent("compr-product-diagnostics.json")
        guard FileManager.default.fileExists(atPath: source.path) else { return }

        let documents = container.appendingPathComponent("Documents", isDirectory: true)
        let readableCopy = documents.appendingPathComponent("compr-product-diagnostics.json")
        do {
            try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: readableCopy.path) {
                try FileManager.default.removeItem(at: readableCopy)
            }
            try FileManager.default.copyItem(at: source, to: readableCopy)
        } catch {
            // Diagnostics must never affect normal app or extension startup.
        }
    }
#endif

#if os(iOS)
    private func installNativeAppleSignInButton() {
        let button = ASAuthorizationAppleIDButton(type: .signIn, style: .black)
        button.cornerRadius = 10
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(startAppleSignIn), for: .touchUpInside)
        view.addSubview(button)
        NSLayoutConstraint.activate([
            button.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            button.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            button.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -14),
            button.heightAnchor.constraint(equalToConstant: 52)
        ])
        webView.scrollView.contentInset.bottom = 84
        webView.scrollView.verticalScrollIndicatorInsets.bottom = 84
        nativeAppleSignInButton = button
        button.isHidden = hasStoredSession
    }

    private var hasStoredSession: Bool {
        guard let session = UserDefaults(suiteName: "group.nl.getcompr.compr")?.dictionary(forKey: ComprNativeAuthConfig.sessionKey) else { return false }
        let expiresAt = (session["expires_at"] as? NSNumber)?.doubleValue ?? 0
        return session["access_token"] as? String != nil && session["refresh_token"] as? String != nil && expiresAt > Date().timeIntervalSince1970 + 30
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        consumePendingAppleSignIn()
    }

    @objc private func handleAppleSignInRequest() { consumePendingAppleSignIn() }

    private func consumePendingAppleSignIn() {
        guard UserDefaults.standard.bool(forKey: "comprPendingAppleSignIn"), view.window != nil else { return }
        UserDefaults.standard.set(false, forKey: "comprPendingAppleSignIn")
        startAppleSignIn()
    }

    @objc private func startAppleSignIn() {
        webView.evaluateJavaScript("appleSignInStarted()")
        appleSignInCoordinator = AppleSignInCoordinator(viewController: self)
        appleSignInCoordinator?.start()
    }

    func appleSignInDidFinish(_ success: Bool) {
        nativeAppleSignInButton?.isHidden = success
        webView.evaluateJavaScript("appleSignInCompleted(\(success ? "true" : "false"))")
    }
#endif

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        webView.evaluateJavaScript("setLanguage('\(containerLanguage)'); show('ios')")
        if hasStoredSession { webView.evaluateJavaScript("appleSignInCompleted(true)") }
#elseif os(macOS)
        webView.evaluateJavaScript("setLanguage('\(containerLanguage)'); show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, error in
            guard let state = state, error == nil else { return }
            DispatchQueue.main.async {
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show('mac', \(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show('mac', \(state.isEnabled), false)")
                }
            }
        }
#endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let action = message.body as? String else { return }

#if os(iOS)
        if action == "sign-in-with-apple" {
            startAppleSignIn()
        } else if action == "open-extension-settings" {
            if #available(iOS 26.2, *) {
                SFSafariSettings.openExtensionsSettings(forIdentifiers: [extensionBundleIdentifier])
            } else if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        }
#elseif os(macOS)
        if action == "open-preferences" {
            SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                guard error == nil else { return }
                DispatchQueue.main.async { NSApp.terminate(self) }
            }
        }
#endif
    }
}

#if os(iOS)
@MainActor
final class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private weak var viewController: ViewController?
    private var rawNonce = ""
    private let appGroup = "group.nl.getcompr.compr"
    private var supabaseURL: String { ComprNativeAuthConfig.url }
    private var supabaseKey: String { ComprNativeAuthConfig.publicKey }

    init(viewController: ViewController) { self.viewController = viewController }

    func start() {
        rawNonce = Self.randomNonce()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(rawNonce)
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        viewController?.view.window ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else { finish(false); return }
        let nonce = rawNonce
        Task {
            do {
                let session = try await exchange(idToken: idToken, nonce: nonce)
                guard let defaults = UserDefaults(suiteName: appGroup) else { throw URLError(.cannotCreateFile) }
                defaults.set(session, forKey: ComprNativeAuthConfig.sessionKey)
                defaults.set(credential.user, forKey: ComprNativeAuthConfig.appleUserKey)
                finish(true)
            } catch { finish(false) }
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) { finish(false) }

    private func exchange(idToken: String, nonce: String) async throws -> [String: Any] {
        var request = URLRequest(url: URL(string: "\(supabaseURL)/auth/v1/token?grant_type=id_token")!)
        request.httpMethod = "POST"
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["provider": "apple", "id_token": idToken, "nonce": nonce])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = payload["access_token"] as? String,
              let refresh = payload["refresh_token"] as? String,
              let user = payload["user"] as? [String: Any],
              let userID = user["id"] as? String, UUID(uuidString: userID) != nil else { throw URLError(.userAuthenticationRequired) }
        let expiresIn = (payload["expires_in"] as? NSNumber)?.doubleValue ?? 3600
        return ["user": ["id": userID], "projectRef": ComprNativeAuthConfig.projectRef, "access_token": access, "refresh_token": refresh, "expires_at": floor(Date().timeIntervalSince1970 + expiresIn)]
    }

    private func finish(_ success: Bool) {
        viewController?.appleSignInDidFinish(success)
    }

    private static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    private static func randomNonce() -> String {
        let alphabet = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String((0..<32).map { _ in alphabet.randomElement()! })
    }
}
#endif

private enum ComprNativeAuthConfig {
    static let productionRef = "taosgvfdnblnopaywimf"
    static var projectRef: String {
#if DEBUG
        guard let ref = Bundle.main.object(forInfoDictionaryKey: "COMPRSandboxProjectRef") as? String,
              ref == "uhvukecryuvosuascics" else { preconditionFailure("SANDBOX_CONFIGURATION_REQUIRED") }
        return ref
#else
        return productionRef
#endif
    }
    static var url: String { "https://\(projectRef).supabase.co" }
    static var publicKey: String {
#if DEBUG
        guard let key = Bundle.main.object(forInfoDictionaryKey: "COMPRSandboxAnonKey") as? String,
              key.hasPrefix("eyJ") else { preconditionFailure("SANDBOX_PUBLIC_KEY_REQUIRED") }
        return key
#else
        return "sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W"
#endif
    }
    static var sessionKey: String {
#if DEBUG
        return "comprAuthSession:\(projectRef)"
#else
        return "comprAuthSession"
#endif
    }
    static var appleUserKey: String {
#if DEBUG
        return "comprAppleUser:\(projectRef)"
#else
        return "comprAppleUser"
#endif
    }
}
