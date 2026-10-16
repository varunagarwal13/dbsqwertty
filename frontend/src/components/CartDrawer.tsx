import React, { useEffect, useState } from "react";
import { Product } from "../data/products";

export interface CartItem {
  cartItemId?: number;
  product: Product;
  quantity: number;
  selectedFinish: string;
  selectedOption: string;
}

/* ── design tokens (mirrors kage.html :root) ── */
const T = {
  ink:      "#05070a",
  ink2:     "#0a0e12",
  bone:     "#dfe7e0",
  boneDim:  "#aab4ad",
  muted:    "#78837c",
  line:     "rgba(223,231,224,.13)",
  lineSoft: "rgba(223,231,224,.07)",
  vermilion:"#e0231c",
  ember:    "#ff5a3c",
  font:     "'Onest',system-ui,-apple-system,'Helvetica Neue',sans-serif",
  ease:     "cubic-bezier(.22,.61,.36,1)",
  easeOut:  "cubic-bezier(.16,1,.3,1)",
};

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (idx: number) => void;
  onUpdateQuantity: (idx: number, newQty: number) => void;
  onSelectProduct: (productId: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen, onClose, cart, onRemoveItem, onUpdateQuantity, onSelectProduct,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, 420);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 150, display: "flex", justifyContent: "flex-end",
      fontFamily: T.font, fontWeight: 300,
      WebkitFontSmoothing: "antialiased",
    }}>
      {/* backdrop */}
      <div
        onClick={requestClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(5,7,10,.78)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: isClosing ? "cart-backdrop-out .4s ease-in forwards" : "cart-backdrop-in .35s ease-out",
        }}
      />

      {/* drawer panel */}
      <div style={{
        position: "relative", width: "min(440px, 100vw)", height: "100%",
        backgroundColor: T.ink2,
        borderLeft: `1px solid ${T.lineSoft}`,
        display: "flex", flexDirection: "column", zIndex: 151,
        animation: isClosing ? "cart-slide-out .4s cubic-bezier(.7,0,.84,0) forwards" : "cart-slide-in .45s cubic-bezier(.16,1,.3,1)",
      }}>
        {/* header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "28px 28px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg viewBox="0 0 20 20" fill="none" width={16} height={16}>
              <path d="M6 6h12l-1.5 7H7.5L6 6Z" stroke={T.bone} strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M6 6 5 2H2" stroke={T.bone} strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="9" cy="17" r="1.2" fill={T.bone}/>
              <circle cx="15" cy="17" r="1.2" fill={T.bone}/>
            </svg>
            <h2 style={{
              fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase",
              color: T.boneDim, margin: 0,
            }}>
              Your Selection <span style={{ color: T.bone }}>({totalItemCount})</span>
            </h2>
          </div>
          <button onClick={requestClose} style={{
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: T.bone, fontSize: 16,
            border: `1px solid ${T.lineSoft}`, borderRadius: "50%",
            transition: `border-color .35s ${T.ease}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(223,231,224,.30)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.lineSoft)}
          >✕</button>
        </div>

        {/* shipping progress */}
        <div style={{
          padding: "18px 28px 16px", borderBottom: `1px solid ${T.lineSoft}`,
          margin: "0 0 0",
        }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 300 }}>
            {cartTotal >= 150
              ? <><span style={{ color: "#5CB57A" }}>✓</span> Complimentary Studio Courier unlocked</>
              : <>Add <span style={{ color: T.bone, fontWeight: 400 }}>${(150 - cartTotal).toFixed(0)}</span> more for free delivery</>
            }
          </div>
          <div style={{ width: "100%", height: 2, background: T.lineSoft, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (cartTotal / 150) * 100)}%`,
              height: "100%", background: cartTotal >= 150 ? "#5CB57A" : T.vermilion,
              transition: "width .6s cubic-bezier(.16,1,.3,1)",
            }} />
          </div>
        </div>

        {/* items */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "0 28px",
          display: "flex", flexDirection: "column",
        }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 80 }}>
              <svg viewBox="0 0 48 48" fill="none" width={48} height={48} style={{ margin: "0 auto 16px", opacity: .25 }}>
                <path d="M12 12h30l-3.75 17.5H15L12 12Z" stroke={T.bone} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 12 10 4H4" stroke={T.bone} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="19" cy="38" r="2.5" stroke={T.bone} strokeWidth="1.5"/>
                <circle cx="35" cy="38" r="2.5" stroke={T.bone} strokeWidth="1.5"/>
              </svg>
              <p style={{ color: T.muted, fontSize: 14, fontWeight: 300, margin: 0 }}>
                Your selection is empty
              </p>
              <p style={{ color: "#5a6360", fontSize: 12, fontWeight: 300, marginTop: 6 }}>
                Explore the sanctuary collection to begin
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.product.id}-${item.selectedFinish}-${item.selectedOption}-${idx}`} style={{
                display: "flex", gap: 16, padding: "20px 0",
                borderBottom: `1px solid ${T.lineSoft}`,
              }}>
                {/* thumbnail */}
                <div
                  onClick={() => onSelectProduct(item.product.id)}
                  style={{
                    width: 80, height: 80, flexShrink: 0, cursor: "pointer",
                    position: "relative", overflow: "hidden",
                    outline: `1px solid ${T.lineSoft}`, outlineOffset: -1,
                  }}
                >
                  <img src={item.product.image} alt="" style={{
                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                    filter: "saturate(.92) brightness(.96)",
                    transition: `transform .8s ${T.easeOut}`,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                  />
                </div>

                {/* info */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span
                    onClick={() => onSelectProduct(item.product.id)}
                    style={{ fontSize: 14, fontWeight: 400, color: T.bone, cursor: "pointer", lineHeight: 1.3 }}
                  >
                    {item.product.name}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted, marginTop: 3, fontWeight: 300 }}>
                    {item.selectedFinish}
                    {item.selectedOption ? ` · ${item.selectedOption}` : ""}
                  </span>

                  {/* quantity + price row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 10 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center",
                      border: `1px solid ${T.lineSoft}`,
                    }}>
                      <button
                        onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                        style={{
                          padding: "4px 10px", fontSize: 14, color: item.quantity <= 1 ? T.muted : T.bone,
                          cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                        }}
                      >−</button>
                      <span style={{
                        minWidth: 24, textAlign: "center", fontSize: 12, fontWeight: 400,
                        fontVariantNumeric: "tabular-nums", color: T.bone,
                      }}>{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                        style={{ padding: "4px 10px", fontSize: 14, color: T.bone, cursor: "pointer" }}
                      >+</button>
                    </div>

                    <span style={{ fontSize: 14, fontWeight: 400, fontVariantNumeric: "tabular-nums", color: T.bone }}>
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* remove */}
                  <button
                    onClick={() => onRemoveItem(idx)}
                    style={{
                      alignSelf: "flex-start", marginTop: 6, padding: 0,
                      fontSize: 10, color: T.muted, cursor: "pointer",
                      letterSpacing: ".18em", textTransform: "uppercase",
                      transition: `color .3s ${T.ease}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.ember)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                  >Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* summary + checkout */}
        <div style={{ padding: "20px 28px 28px", borderTop: `1px solid ${T.lineSoft}` }}>
          {/* subtotal */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 300, letterSpacing: ".1em", textTransform: "uppercase" }}>Subtotal</span>
            <span style={{ fontSize: "clamp(20px,1.8vw,28px)", fontWeight: 300, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: T.bone }}>
              ${cartTotal.toFixed(2)}
            </span>
          </div>
          <p style={{ fontSize: 11, color: T.muted, margin: "0 0 18px", fontWeight: 300 }}>
            Shipping & tax calculated at checkout
          </p>

          {/* checkout CTA */}
          <button
            disabled={cart.length === 0}
            onClick={() => alert(`Proceeding to checkout · ${totalItemCount} items · $${cartTotal.toFixed(2)}`)}
            style={{
              width: "100%", position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14,
              padding: "17px 30px", border: `1px solid ${cart.length > 0 ? T.line : T.lineSoft}`, borderRadius: 100, overflow: "hidden",
              fontSize: 11, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase",
              color: cart.length > 0 ? T.bone : T.muted,
              cursor: cart.length > 0 ? "pointer" : "not-allowed",
              background: "transparent",
              transition: `color .45s ${T.ease}, border-color .45s, background .35s`,
            }}
            onMouseEnter={e => { if (cart.length > 0) { e.currentTarget.style.background = T.bone; e.currentTarget.style.color = T.ink; e.currentTarget.style.borderColor = T.bone; } }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = cart.length > 0 ? T.bone : T.muted; e.currentTarget.style.borderColor = cart.length > 0 ? T.line : T.lineSoft; }}
          >
            Proceed to Checkout
            <svg viewBox="0 0 14 14" fill="none" width={13} height={13}><path d="M3 11 11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.3"/></svg>
          </button>

          {/* continue shopping */}
          <button
            onClick={requestClose}
            style={{
              width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              marginTop: 12, padding: "12px 0",
              fontSize: 11, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase",
              color: T.muted, cursor: "pointer",
              transition: `color .3s ${T.ease}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = T.bone)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            ← Continue Browsing
          </button>
        </div>
      </div>

      {/* CSS animations injected inline */}
      <style>{`
        @keyframes cart-slide-in {
          from { transform: translate3d(100%,0,0); }
          to   { transform: translate3d(0,0,0); }
        }
        @keyframes cart-slide-out {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(100%,0,0); }
        }
        @keyframes cart-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cart-backdrop-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate3d(0,12px,0); }
          to   { opacity: 1; transform: translate3d(0,0,0); }
        }
      `}</style>
    </div>
  );
};
