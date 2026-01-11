import Foundation
import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    private var products: [String: Product] = [:]
    private var purchasedProductIDs: Set<String> = []
    private var updateListenerTask: Task<Void, Error>? = nil

    public override func load() {
        // Start listening for transactions
        updateListenerTask = listenForTransactions()
    }

    deinit {
        updateListenerTask?.cancel()
    }

    /// Listen for transaction updates
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await self.updateCustomerProductStatus()
                    await transaction.finish()
                } catch {
                    print("[StoreKit] Transaction verification failed: \(error)")
                }
            }
        }
    }

    /// Verify transaction signature
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    /// Update purchased product status
    @MainActor
    private func updateCustomerProductStatus() async {
        var purchased: Set<String> = []

        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)
                if transaction.revocationDate == nil {
                    purchased.insert(transaction.productID)
                }
            } catch {
                print("[StoreKit] Failed to verify entitlement: \(error)")
            }
        }

        purchasedProductIDs = purchased
    }

    // MARK: - Plugin Methods

    /// Get products from App Store
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds parameter")
            return
        }

        Task {
            do {
                let storeProducts = try await Product.products(for: Set(productIds))

                var productsArray: [[String: Any]] = []
                for product in storeProducts {
                    self.products[product.id] = product

                    productsArray.append([
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice,
                        "priceValue": NSDecimalNumber(decimal: product.price).doubleValue,
                        "currencyCode": product.priceFormatStyle.currencyCode ?? "USD"
                    ])
                }

                call.resolve(["products": productsArray])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }

    /// Purchase a product
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId parameter")
            return
        }

        guard let product = products[productId] else {
            call.reject("Product not found. Call getProducts first.")
            return
        }

        Task {
            do {
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)

                    // Get the signed transaction data for server verification
                    let jwsRepresentation = verification.jwsRepresentation

                    call.resolve([
                        "success": true,
                        "transactionId": String(transaction.id),
                        "transaction": jwsRepresentation
                    ])

                case .userCancelled:
                    call.resolve([
                        "success": false,
                        "cancelled": true
                    ])

                case .pending:
                    call.resolve([
                        "success": false,
                        "pending": true,
                        "error": "Purchase is pending approval"
                    ])

                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    /// Finish a transaction
    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionIdString = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdString) else {
            call.reject("Missing or invalid transactionId parameter")
            return
        }

        Task {
            // Find and finish the transaction
            for await result in Transaction.all {
                do {
                    let transaction = try checkVerified(result)
                    if transaction.id == transactionId {
                        await transaction.finish()
                        call.resolve()
                        return
                    }
                } catch {
                    // Continue checking other transactions
                }
            }

            // Transaction not found, but that's okay - it might already be finished
            call.resolve()
        }
    }

    /// Restore previous purchases
    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                // Sync with App Store
                try await AppStore.sync()

                // Get all current entitlements
                var transactions: [String] = []

                for await result in Transaction.currentEntitlements {
                    do {
                        let transaction = try checkVerified(result)
                        if transaction.revocationDate == nil {
                            // Get the signed transaction
                            transactions.append(result.jwsRepresentation)
                        }
                    } catch {
                        print("[StoreKit] Failed to verify restored transaction: \(error)")
                    }
                }

                call.resolve(["transactions": transactions])
            } catch {
                call.reject("Failed to restore purchases: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - Errors

enum StoreError: Error {
    case failedVerification
    case unknown
}
