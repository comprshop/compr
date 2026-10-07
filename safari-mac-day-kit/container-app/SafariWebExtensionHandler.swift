import SafariServices
import StoreKit

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let appGroup = "group.nl.getcompr.compr"
    private let productIDs: Set<String> = [
        "nl.getcompr.pro.monthly",
        "nl.getcompr.pro.yearly",
        "nl.getcompr.ultimate.monthly",
        "nl.getcompr.ultimate.yearly"
    ]

    func beginRequest(with context: NSExtensionContext) {
        guard
            let item = context.inputItems.first as? NSExtensionItem,
            let userInfo = item.userInfo as? [String: Any],
            let message = userInfo[SFExtensionMessageKey] as? [String: Any],
            let action = message["action"] as? String
        else {
            complete(context, payload: ["ok": false, "code": "NATIVE_ACTION_UNAVAILABLE"])
            return
        }

        if action == "auth.session" { authSession(context); return }
        if action == "auth.clear" { authClear(context); return }
        if action == "auth.openApp" { openApp(context); return }

        guard #available(iOS 15.0, macOS 12.0, *) else {
            complete(context, payload: ["ok": false, "code": "STOREKIT_UNAVAILABLE"])
            return
        }

        Task {
            switch action {
            case "billing.products":
                await products(context)
            case "billing.purchase":
                await purchase(context, message: message)
            case "billing.restore":
                await restore(context)
            case "billing.finish":
                await finish(context, message: message)
            default:
                complete(context, payload: ["ok": false, "code": "NATIVE_ACTION_UNAVAILABLE"])
            }
        }
    }

    private func authSession(_ context: NSExtensionContext) {
        guard let session = UserDefaults(suiteName: appGroup)?.dictionary(forKey: ComprNativeAuthConfig.sessionKey),
              session["access_token"] is String, session["refresh_token"] is String else {
            complete(context, payload: ["ok": true, "session": NSNull()]); return
        }
        complete(context, payload: ["ok": true, "session": session])
    }

    private func authClear(_ context: NSExtensionContext) {
        UserDefaults(suiteName: appGroup)?.removeObject(forKey: ComprNativeAuthConfig.sessionKey)
        complete(context, payload: ["ok": true])
    }

    private func openApp(_ context: NSExtensionContext) {
        guard let url = URL(string: "compr://signin") else { complete(context, payload: ["ok": false]); return }
        context.open(url) { opened in self.complete(context, payload: ["ok": opened]) }
    }

    @available(iOS 15.0, macOS 12.0, *)
    private func products(_ context: NSExtensionContext) async {
        do {
            let products = try await Product.products(for: productIDs)
            let safeProducts = products
                .filter { productIDs.contains($0.id) }
                .sorted { $0.id < $1.id }
                .map { product in
                    [
                        "id": product.id,
                        "displayName": String(product.displayName.prefix(120)),
                        "displayPrice": String(product.displayPrice.prefix(80))
                    ]
                }
            complete(context, payload: ["ok": true, "products": safeProducts])
        } catch {
            complete(context, payload: ["ok": false, "code": "APPLE_PRODUCTS_UNAVAILABLE"])
        }
    }

    @available(iOS 15.0, macOS 12.0, *)
    private func purchase(_ context: NSExtensionContext, message: [String: Any]) async {
        guard
            let productID = message["productId"] as? String,
            productIDs.contains(productID),
            let tokenText = message["appAccountToken"] as? String,
            let accountToken = UUID(uuidString: tokenText),
            let product = try? await Product.products(for: [productID]).first
        else {
            complete(context, payload: ["ok": false, "code": "APPLE_PURCHASE_INVALID"])
            return
        }

        do {
            let result = try await product.purchase(options: [.appAccountToken(accountToken)])
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    guard productIDs.contains(transaction.productID) else {
                        complete(context, payload: ["ok": false, "code": "APPLE_PURCHASE_INVALID"])
                        return
                    }
                    complete(context, payload: [
                        "ok": true,
                        "status": "success",
                        "transactionId": String(transaction.id),
                        "signedTransactionInfo": verification.jwsRepresentation
                    ])
                case .unverified:
                    complete(context, payload: ["ok": false, "code": "APPLE_TRANSACTION_UNVERIFIED"])
                }
            case .pending:
                complete(context, payload: ["ok": true, "status": "pending"])
            case .userCancelled:
                complete(context, payload: ["ok": true, "status": "cancelled"])
            @unknown default:
                complete(context, payload: ["ok": false, "code": "APPLE_PURCHASE_UNAVAILABLE"])
            }
        } catch {
            complete(context, payload: ["ok": false, "code": "APPLE_PURCHASE_UNAVAILABLE"])
        }
    }

    @available(iOS 15.0, macOS 12.0, *)
    private func restore(_ context: NSExtensionContext) async {
        do {
            try await AppStore.sync()
            var restored: [[String: String]] = []
            for await verification in Transaction.currentEntitlements {
                guard restored.count < 4 else { break }
                if case .verified(let transaction) = verification,
                   productIDs.contains(transaction.productID) {
                    restored.append([
                        "transactionId": String(transaction.id),
                        "signedTransactionInfo": verification.jwsRepresentation
                    ])
                }
            }
            complete(context, payload: ["ok": true, "transactions": restored])
        } catch {
            complete(context, payload: ["ok": false, "code": "APPLE_RESTORE_UNAVAILABLE"])
        }
    }

    @available(iOS 15.0, macOS 12.0, *)
    private func finish(_ context: NSExtensionContext, message: [String: Any]) async {
        guard let requestedID = message["transactionId"] as? String else {
            complete(context, payload: ["ok": false, "code": "APPLE_FINISH_INVALID"])
            return
        }
        for await verification in Transaction.unfinished {
            if case .verified(let transaction) = verification,
               productIDs.contains(transaction.productID),
               String(transaction.id) == requestedID {
                await transaction.finish()
                complete(context, payload: ["ok": true])
                return
            }
        }
        complete(context, payload: ["ok": true])
    }

    private func complete(_ context: NSExtensionContext, payload: [String: Any]) {
        // Never log or echo incoming messages. Future payloads may contain
        // account or purchase data. Only allowlisted response fields leave here.
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: payload]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}

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
