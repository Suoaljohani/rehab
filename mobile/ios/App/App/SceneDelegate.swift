import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The portal's native shell: the live مَسار website inside a WKWebView,
/// with iPhone conveniences the website alone cannot offer.
class MainViewController: CAPBridgeViewController {
    private var urlObservation: NSKeyValueObservation?
    private let lastURLKey = "masar.lastPortalURL"

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }

        // Swipe from the edge to go back / forward, like Safari.
        webView.allowsBackForwardNavigationGestures = true

        // Pull down to refresh the current page.
        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(red: 0x44 / 255.0, green: 0x55 / 255.0, blue: 0x6B / 255.0, alpha: 1)
        refresh.addTarget(self, action: #selector(pullToRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        // Remember the last portal page so a signed-in user resumes where they left off.
        urlObservation = webView.observe(\.url, options: [.new]) { [weak self] view, _ in
            guard let self = self, let url = view.url, self.isPortal(url) else { return }
            UserDefaults.standard.set(url.absoluteString, forKey: self.lastURLKey)
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        if let saved = UserDefaults.standard.string(forKey: lastURLKey),
           let url = URL(string: saved), isPortal(url),
           !url.path.hasPrefix("/login"), !url.path.hasPrefix("/auth") {
            webView?.load(URLRequest(url: url))
        }
    }

    private func isPortal(_ url: URL) -> Bool {
        guard let host = url.host, let portalHost = bridge?.config.serverURL.host else { return false }
        return host == portalHost
    }

    @objc private func pullToRefresh(_ sender: UIRefreshControl) {
        webView?.reload()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { sender.endRefreshing() }
    }
}
