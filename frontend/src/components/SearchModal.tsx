import React, { useEffect, useRef, useState } from "react";
import { api, DBProduct } from "../services/api";
import { PRODUCTS, Product } from "../data/products";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (productId: string) => void;
}

const T = {
  ink: "#05070a",
  ink2: "#0a0e12",
  ink3: "#121820",
  bone: "#dfe7e0",
  boneDim: "#aab4ad",
  muted: "#78837c",
  line: "rgba(223,231,224,.13)",
  lineSoft: "rgba(223,231,224,.07)",
  vermilion: "#e0231c",
  font: "'Onest',system-ui,-apple-system,'Helvetica Neue',sans-serif",
  ease: "cubic-bezier(.22,.61,.36,1)",
};

const DB_ID_TO_PRODUCT_ID: Record<number, string> = {
  1: "keyboard",
  2: "mouse",
  3: "lamp",
  4: "dac",
  34: "macropad",
};

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState("");
  const [dbResults, setDbResults] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setLoading(true);
      // Fetch initial all products from DB
      api.fetchProducts()
        .then(data => setDbResults(data))
        .finally(() => setLoading(false));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setLoading(true);
      if (!query.trim()) {
        api.fetchProducts()
          .then(data => setDbResults(data))
          .finally(() => setLoading(false));
      } else {
        api.searchProducts(query)
          .then(data => setDbResults(data))
          .finally(() => setLoading(false));
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 180,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "clamp(40px, 12vh, 100px)",
      fontFamily: T.font, fontWeight: 300,
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(3, 5, 8, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />

      {/* Modal Card */}
      <div style={{
        position: "relative",
        width: "min(680px, 94vw)",
        maxHeight: "80vh",
        backgroundColor: T.ink2,
        border: `1px solid ${T.line}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        zIndex: 181,
      }}>
        {/* Search Bar Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "20px 24px", borderBottom: `1px solid ${T.lineSoft}`,
          background: T.ink,
        }}>
          <svg viewBox="0 0 20 20" fill="none" width={18} height={18} style={{ color: T.vermilion, flexShrink: 0 }}>
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products in database by name, brand, or category (e.g. keyboard, mouse, audio)..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: T.bone, fontSize: 15, fontFamily: T.font, fontWeight: 300,
            }}
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none", border: "none", color: T.muted,
                cursor: "pointer", fontSize: 13, padding: "4px 8px",
              }}
            >
              Clear
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: "4px 8px", background: "rgba(223,231,224,0.06)",
              border: `1px solid ${T.lineSoft}`, borderRadius: 4,
              color: T.muted, fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", cursor: "pointer",
            }}
          >
            ESC
          </button>
        </div>

        {/* Database Search Info Banner */}
        <div style={{
          padding: "8px 24px", background: "rgba(224,35,28,0.04)",
          borderBottom: `1px solid ${T.lineSoft}`, display: "flex",
          justifyContent: "space-between", alignItems: "center", fontSize: 11,
          color: T.muted,
        }}>
          <span>
            Querying Oracle SQL Database: <code style={{ color: T.bone }}>Product</code> ⋈ <code style={{ color: T.bone }}>Inventory</code>
          </span>
          <span>
            {loading ? "Searching..." : `${dbResults.length} ${dbResults.length === 1 ? "product" : "products"} available`}
          </span>
        </div>

        {/* Search Results List */}
        <div style={{ padding: "12px 16px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {dbResults.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: T.muted }}>
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>🔍</div>
              <div style={{ fontSize: 13, color: T.boneDim }}>No products found matching &ldquo;{query}&rdquo;</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Try searching for &quot;Axis&quot;, &quot;Mouse&quot;, &quot;Light&quot;, or &quot;Hub&quot;</div>
            </div>
          ) : (
            dbResults.map((prod) => {
              const appKey = DB_ID_TO_PRODUCT_ID[prod.product_id] || "keyboard";
              const catalogItem: Product | undefined = PRODUCTS[appKey];
              const stock = prod.available_quantity;

              return (
                <div
                  key={prod.product_id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(appKey);
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", background: T.ink,
                    border: `1px solid ${T.lineSoft}`, cursor: "pointer",
                    transition: `all .2s ${T.ease}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(224,35,28,0.4)";
                    e.currentTarget.style.background = "rgba(224,35,28,0.04)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.lineSoft;
                    e.currentTarget.style.background = T.ink;
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 44, height: 44, overflow: "hidden", flexShrink: 0,
                      border: `1px solid ${T.lineSoft}`, background: T.ink2,
                    }}>
                      <img
                        src={catalogItem?.image || "/images/keyboard/keyboard_1.jpg"}
                        alt={prod.product_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 14, color: T.bone, fontWeight: 400 }}>
                        {prod.product_name}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, display: "flex", gap: 8, marginTop: 2 }}>
                        <span>Brand: {prod.brand}</span>
                        <span>·</span>
                        <span>ID: #{prod.product_id}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Stock pill */}
                    <span style={{
                      fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase",
                      padding: "3px 8px",
                      background: stock > 0 ? "rgba(92,181,122,0.12)" : "rgba(231,76,60,0.12)",
                      border: `1px solid ${stock > 0 ? "#5CB57A" : "#e74c3c"}`,
                      color: stock > 0 ? "#5CB57A" : "#e74c3c",
                    }}>
                      {stock > 0 ? `${stock} in stock` : "Out of stock"}
                    </span>

                    {/* Price */}
                    <span style={{ fontSize: 15, color: T.bone, fontWeight: 400, minWidth: 60, textAlign: "right" }}>
                      ${prod.price.toFixed(2)}
                    </span>

                    <span style={{ color: T.muted, fontSize: 13 }}>→</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
