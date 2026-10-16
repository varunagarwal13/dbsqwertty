import React, { useState, useEffect, useCallback } from "react";
import { KageStoreLandingPage } from "./shaders/landing-pages/LandingPages";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { PRODUCTS, Product } from "./data/products";
import { CartDrawer, CartItem } from "./components/CartDrawer";
import { CheckoutModal } from "./components/CheckoutModal";
import { OrdersModal } from "./components/OrdersModal";
import { SearchModal } from "./components/SearchModal";
import { CustomerModal } from "./components/CustomerModal";
import { api, getApiBase } from "./services/api";
import "./shaders/threeui.css";

const PRODUCT_DB_ID_MAP: Record<string, number> = {
  keyboard: 1, // Axis Mechanical Keyboard
  mouse: 2,    // Arc Wireless Mouse
  lamp: 3,     // Halo Desk Light
  dac: 4,      // Orbit USB-C Hub
  macropad: 34,// Link USB-C Cable / accessory
};

const DB_ID_TO_PRODUCT_ID: Record<number, string> = {
  1: "keyboard",
  2: "mouse",
  3: "lamp",
  4: "dac",
  34: "macropad",
};

export default function App() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#/product/")) {
      const id = hash.replace("#/product/", "");
      return PRODUCTS[id] ? id : null;
    }
    return null;
  });

  const [cart, setCart] = useState<CartItem[]>(() => api.getStoredCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState(() => api.getActiveCustomerId());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    api.saveStoredCart(cart);
  }, [cart]);

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Sync live cart count to kage.html native navbar
  useEffect(() => {
    const syncCount = () => {
      const iframe = document.querySelector<HTMLIFrameElement>(".shader-frame iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "UPDATE_CART_COUNT", count: totalItemCount }, "*");
      }
    };
    syncCount();
    const timer = setTimeout(syncCount, 600);
    return () => clearTimeout(timer);
  }, [totalItemCount, selectedProductId]);

  // Sync initial cart from Oracle SQL Database Backend for active customer
  const syncCartFromDB = useCallback((custId: string) => {
    fetch(`${getApiBase()}/cart?customer_id=${custId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          const loadedItems: CartItem[] = [];
          for (const item of res.data) {
            const prodKey = DB_ID_TO_PRODUCT_ID[item.product_id];
            if (prodKey && PRODUCTS[prodKey]) {
              const product = PRODUCTS[prodKey];
              loadedItems.push({
                cartItemId: item.cart_item_id,
                product,
                quantity: item.quantity,
                selectedFinish: product.finishes[0]?.name || "Default",
                selectedOption: product.options?.[0] || "",
              });
            }
          }
          setCart(loadedItems);
        } else {
          setCart([]);
        }
      })
      .catch((err) => {
        console.warn("[Backend DB] Offline or unreachable, using local state:", err);
      });
  }, []);

  useEffect(() => {
    syncCartFromDB(activeCustomerId);
  }, [activeCustomerId, syncCartFromDB]);

  // Listen for browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/product/")) {
        const id = hash.replace("#/product/", "");
        if (PRODUCTS[id]) { setSelectedProductId(id); return; }
      }
      setSelectedProductId(null);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Listen for postMessage from the iframe (kage.html)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NAVIGATE_PRODUCT") {
        const productId = event.data.product;
        if (PRODUCTS[productId]) {
          window.location.hash = `#/product/${productId}`;
          setSelectedProductId(productId);
        }
      }
      if (event.data && event.data.type === "OPEN_CART") {
        setIsCartOpen(true);
      }
      if (event.data && event.data.type === "OPEN_SEARCH") {
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSelectProduct = useCallback((productId: string) => {
    if (PRODUCTS[productId]) {
      window.location.hash = `#/product/${productId}`;
      setSelectedProductId(productId);
    }
  }, []);

  const handleBackToStore = useCallback(() => {
    window.location.hash = "";
    setSelectedProductId(null);
  }, []);

  const handleAddToCart = useCallback((product: Product, quantity: number, selectedFinish: string, selectedOption: string) => {
    // 1. Optimistic React state update
    setCart(prev => {
      const existing = prev.find(
        item => item.product.id === product.id &&
                item.selectedFinish === selectedFinish &&
                item.selectedOption === selectedOption
      );
      if (existing) {
        return prev.map(item =>
          item === existing ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity, selectedFinish, selectedOption }];
    });

    setToastMessage(`${product.name} added to selection`);
    setTimeout(() => setToastMessage(null), 2400);
    setIsCartOpen(true);

    // 2. Persist to Oracle SQL Database
    const dbProductId = PRODUCT_DB_ID_MAP[product.id] || 1;
    fetch(`${getApiBase()}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: activeCustomerId,
        product_id: dbProductId,
        quantity: quantity,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.cart_item_id) {
          setCart(prev =>
            prev.map(item =>
              item.product.id === product.id && item.selectedFinish === selectedFinish
                ? { ...item, cartItemId: data.cart_item_id }
                : item
            )
          );
        }
      })
      .catch(err => {
        console.warn("[Oracle SQL DB] Failed to persist cart item:", err);
      });
  }, [activeCustomerId]);

  const handleRemoveFromCart = useCallback((idx: number) => {
    setCart(prev => {
      const itemToRemove = prev[idx];
      if (itemToRemove && itemToRemove.cartItemId) {
        fetch(`${getApiBase()}/cart/remove/${itemToRemove.cartItemId}`, {
          method: "DELETE",
        }).catch(err => console.warn("[Oracle SQL DB] Failed to remove item:", err));
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleUpdateQuantity = useCallback((idx: number, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => {
      const item = prev[idx];
      if (item && item.cartItemId) {
        fetch(`${getApiBase()}/cart/update/${item.cartItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQty }),
        }).catch(err => console.warn("[Oracle SQL DB] Failed to update item:", err));
      }
      return prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item);
    });
  }, []);

  const currentProduct = selectedProductId ? PRODUCTS[selectedProductId] : null;

  return (
    <div style={{ width: "100vw", minHeight: "100vh", margin: 0, padding: 0, backgroundColor: "#05070a" }}>
      {currentProduct ? (
        <ProductDetailPage
          product={currentProduct}
          onBack={handleBackToStore}
          onSelectProduct={handleSelectProduct}
          cart={cart}
          onAddToCart={handleAddToCart}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenOrders={() => setIsOrdersOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenCustomer={() => setIsCustomerOpen(true)}
          totalItemCount={totalItemCount}
        />
      ) : (
        <div className="shader-frame" style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, position: "relative" }}>
          <KageStoreLandingPage
            headingFont="onest"
            bodyFont="onest"
            headingWeight="400"
            bodyWeight="300"
            primaryColor="#e0231c"
            headingSize={46}
            bodySize={17}
            headingLetterSpacing={-0.012}
          />
          {/* Customer Quick Navigation: Customer Profile & Order Tracking */}
          <div style={{
            position: "fixed", bottom: 24, left: 24, zIndex: 90,
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px",
            background: "rgba(10,14,18,0.88)", backdropFilter: "blur(14px)",
            border: "1px solid rgba(223,231,224,0.18)", borderRadius: 100,
            boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          }}>
            <button
              onClick={() => setIsCustomerOpen(true)}
              style={{
                padding: "8px 14px", background: "none", border: "none",
                borderRadius: 100, color: "#dfe7e0", fontSize: 11, fontWeight: 500,
                letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, transition: "background .2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(223,231,224,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span>👤</span> {activeCustomerId}
            </button>
            <span style={{ width: 1, height: 14, background: "rgba(223,231,224,0.15)" }} />
            <button
              onClick={() => setIsOrdersOpen(true)}
              style={{
                padding: "8px 14px", background: "none", border: "none",
                borderRadius: 100, color: "#dfe7e0", fontSize: 11, fontWeight: 500,
                letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, transition: "background .2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(223,231,224,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ color: "#e0231c" }}>●</span> Orders
            </button>
          </div>
        </div>
      )}

      {/* Global cart drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateQuantity}
        onSelectProduct={(id) => { setIsCartOpen(false); handleSelectProduct(id); }}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout and Payment Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onOrderCompleted={(order) => {
          setCart([]);
          setToastMessage(`Order #ORD-${order.order_id} recorded in Oracle DB!`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
        onViewOrders={() => {
          setIsCheckoutOpen(false);
          setIsOrdersOpen(true);
        }}
      />

      {/* Sales Orders and Lifecycle Modal */}
      <OrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
      />

      {/* Global Product Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={handleSelectProduct}
      />

      {/* Customer Account & Profile Modal */}
      <CustomerModal
        isOpen={isCustomerOpen}
        onClose={() => setIsCustomerOpen(false)}
        onCustomerChanged={(newId) => {
          setActiveCustomerId(newId);
          setToastMessage(`Switched active session to Customer ${newId}`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* Global toast */}
      {toastMessage && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 200,
          padding: "12px 22px",
          background: "#0a0e12", border: "1px solid rgba(224,35,28,.35)",
          fontSize: 13, fontWeight: 300, color: "#dfe7e0",
          fontFamily: "'Onest',system-ui,-apple-system,'Helvetica Neue',sans-serif",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 10px 40px rgba(0,0,0,.6)",
          animation: "toast-in .3s ease-out",
        }}>
          <span style={{ color: "#e0231c" }}>✓</span> {toastMessage}
        </div>
      )}
    </div>
  );
}
