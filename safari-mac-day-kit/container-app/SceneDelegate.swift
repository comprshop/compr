import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        if connectionOptions.urlContexts.contains(where: isAppleSignInURL) { requestAppleSignIn() }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        if URLContexts.contains(where: isAppleSignInURL) { requestAppleSignIn() }
    }

    private func isAppleSignInURL(_ context: UIOpenURLContext) -> Bool {
        context.url.scheme == "compr" && context.url.host == "signin"
    }

    private func requestAppleSignIn() {
        UserDefaults.standard.set(true, forKey: "comprPendingAppleSignIn")
        NotificationCenter.default.post(name: comprAppleSignInRequested, object: nil)
    }
}
