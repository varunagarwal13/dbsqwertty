import React, { useState, useEffect } from "react";
import { CartItem } from "./CartDrawer";
import { api, DBOrder, DBCustomer } from "../services/api";

const PRODUCT_DB_ID_MAP: Record<string, number> = {
  keyboard: 1,
  mouse: 2,
  lamp: 3,
  dac: 4,
  macropad: 34,
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onOrderCompleted: (order: DBOrder) => void;
  onViewOrders: () => void;
}

const T = {
  ink: "#05070a",
  ink2: "#0a0e12",
  ink3: "#10161d",
  bone: "#dfe7e0",
  boneDim: "#aab4ad",
  muted: "#78837c",
  line: "rgba(223,231,224,.13)",
  lineSoft: "rgba(223,231,224,.07)",
  vermilion: "#e0231c",
  ember: "#ff5a3c",
  font: "'Onest',system-ui,-apple-system,'Helvetica Neue',sans-serif",
  ease: "cubic-bezier(.22,.61,.36,1)",
};

const PAYMENT_MODES = [
  { id: "UPI", name: "UPI / Instant Transfer", desc: "Instant QR / VPA zero fee settlement", badge: "Fastest" },
  { id: "Credit/Debit Card", name: "Credit / Debit Card", desc: "Visa, Mastercard, RuPay & Amex", badge: "Encrypted" },
  { id: "Net Banking", name: "Net Banking", desc: "Direct NEFT / RTGS settlement", badge: "Direct" },
  { id: "SAKURA DECK Test Wallet", name: "MONO Test Wallet", desc: "Simulated instant settlement environment", badge: "Demo" },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onOrderCompleted,
  onViewOrders,
}) => {
  const [selectedMode, setSelectedMode] = useState<string>("SAKURA DECK Test Wallet");
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<DBOrder | null>(null);
  const [customer, setCustomer] = useState<DBCustomer | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.fetchCustomer().then(c => setCustomer(c));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    const fallbackItems = cart.map(item => ({
      productId: PRODUCT_DB_ID_MAP[item.product.id] || 1,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    try {
      const order = await api.checkout(selectedMode, fallbackItems);
      setCompletedOrder(order);
      onOrderCompleted(order);
    } catch (e) {
      console.error("Checkout failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 160,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.font, fontWeight: 300,
    }}>
      {/* Backdrop */}
      <div
        onClick={completedOrder ? undefined : onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(3, 5, 8, 0.85)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />

      {/* Main Container */}
      <div style={{
        position: "relative",
        width: "min(640px, 94vw)",
        maxHeight: "90vh",
        backgroundColor: T.ink2,
        border: `1px solid ${T.line}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        zIndex: 161,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "24px 28px", borderBottom: `1px solid ${T.lineSoft}`,
          background: T.ink,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: T.vermilion, fontSize: 13 }}>◆</span>
              <h2 style={{
                fontSize: 11, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase",
                color: T.bone, margin: 0,
              }}>
                {completedOrder ? "Order Confirmed" : "Checkout & Settlement"}
              </h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: T.muted }}>
              Oracle SQL Database Schema Compliance · Customer #{CURRENT_CUSTOMER_ID}
            </p>
          </div>
          {!completedOrder && (
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: T.boneDim, fontSize: 14,
                border: `1px solid ${T.lineSoft}`, borderRadius: "50%",
                background: "transparent",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Body Content */}
        <div style={{ padding: "26px 28px", overflowY: "auto", flex: 1 }}>
          {completedOrder ? (
            /* Order Confirmation View */
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(92,181,122,0.12)", border: "1px solid #5CB57A",
                color: "#5CB57A", display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 18px", fontSize: 24,
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: 20, color: T.bone, fontWeight: 400, margin: "0 0 6px" }}>
                Order Placed Successfully
              </h3>
              <p style={{ color: T.muted, fontSize: 13, margin: "0 0 24px" }}>
                Recorded in Oracle Database table <code style={{ color: T.vermilion }}>Order_Tab</code> &amp; <code style={{ color: T.vermilion }}>Payment</code>
              </p>

              {/* Order summary card */}
              <div style={{
                background: T.ink, border: `1px solid ${T.lineSoft}`,
                padding: "20px", textAlign: "left", marginBottom: 24,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12, marginBottom: 16 }}>
                  <div>
                    <span style={{ color: T.muted, display: "block" }}>Order Reference</span>
                    <strong style={{ color: T.bone, fontSize: 14 }}>#ORD-{completedOrder.order_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: T.muted, display: "block" }}>Lifecycle State</span>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", background: "rgba(41,128,185,0.2)",
                      border: "1px solid #2980b9", color: "#54a0ff", fontSize: 11, fontWeight: 500,
                    }}>
                      {completedOrder.order_status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: T.muted, display: "block" }}>Settlement Mode</span>
                    <span style={{ color: T.bone }}>{completedOrder.payment_mode}</span>
                  </div>
                  <div>
                    <span style={{ color: T.muted, display: "block" }}>Gateway Status</span>
                    <span style={{ color: "#5CB57A", fontWeight: 500 }}>
                      ✓ {completedOrder.payment_status || "COMPLETED"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: T.muted, display: "block" }}>Amount Paid</span>
                    <span style={{ color: T.bone, fontSize: 14, fontWeight: 500 }}>
                      ${completedOrder.total_amount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: T.muted, display: "block" }}>Timestamp</span>
                    <span style={{ color: T.boneDim }}>
                      {new Date(completedOrder.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Lines breakdown */}
                <div style={{ borderTop: `1px solid ${T.lineSoft}`, paddingTop: 12 }}>
                  <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".15em" }}>
                    Order Lines ({completedOrder.items.length})
                  </span>
                  <div style={{ marginTop: 8 }}>
                    {completedOrder.items.map((line) => (
                      <div key={line.order_item_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.boneDim, margin: "4px 0" }}>
                        <span>{line.product_name} × {line.quantity}</span>
                        <span>${(line.unit_price * line.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => { onClose(); onViewOrders(); }}
                  style={{
                    flex: 1, padding: "14px 20px", background: T.bone, color: T.ink,
                    border: "none", fontSize: 11, fontWeight: 500, letterSpacing: ".18em",
                    textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  View All Orders →
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "14px 20px", background: "transparent", color: T.boneDim,
                    border: `1px solid ${T.lineSoft}`, fontSize: 11, fontWeight: 500,
                    letterSpacing: ".18em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form View */
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Customer Entity Box */}
              <div style={{
                padding: "16px 20px", background: T.ink, border: `1px solid ${T.lineSoft}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".18em" }}>
                    Customer Details (Customer Entity)
                  </span>
                  <span style={{ fontSize: 11, color: T.vermilion, fontWeight: 500 }}>
                    ID: {customer ? customer.customer_id : api.getActiveCustomerId()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: T.bone, lineHeight: 1.5 }}>
                  <strong>{customer ? `${customer.first_name} ${customer.last_name}` : "Varun Agarwal"}</strong> · {customer?.email || "varun.agarwal@example.com"}
                  <div style={{ color: T.boneDim, fontSize: 12, marginTop: 2 }}>
                    {customer?.house_no || "42"} {customer?.street || "Oak Street"}, {customer?.city || "Tokyo"} {customer?.state || "Kanto"} {customer?.pincode || "100-0001"} · Phone: {customer?.phone_no || "555-0199"}
                  </div>
                </div>
              </div>

              {/* Order Lines Summary */}
              <div>
                <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".18em", display: "block", marginBottom: 12 }}>
                  Sales Order Lines (Order_Item Table)
                </span>
                <div style={{ background: T.ink, border: `1px solid ${T.lineSoft}` }}>
                  {cart.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 18px", borderBottom: i < cart.length - 1 ? `1px solid ${T.lineSoft}` : "none",
                      fontSize: 13,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: T.muted, fontSize: 11, minWidth: 20 }}>#{i + 1}</span>
                        <div>
                          <div style={{ color: T.bone }}>{item.product.name}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>
                            Qty: {item.quantity} · ${item.product.price.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                      <span style={{ color: T.bone, fontWeight: 500 }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    padding: "14px 18px", background: "rgba(224,35,28,0.04)",
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    borderTop: `1px solid ${T.lineSoft}`,
                  }}>
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".15em", color: T.muted }}>
                      Settlement Amount Due
                    </span>
                    <span style={{ fontSize: 20, color: T.bone, fontWeight: 400 }}>
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Settlement Mode Selection */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".18em" }}>
                    Payment Records (Payment Entity)
                  </span>
                  <span style={{ fontSize: 10, color: T.boneDim }}>
                    Settlement Mode &amp; Gateway
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {PAYMENT_MODES.map((mode) => {
                    const isSelected = selectedMode === mode.id;
                    return (
                      <div
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "14px 18px", cursor: "pointer",
                          background: isSelected ? "rgba(224,35,28,0.06)" : T.ink,
                          border: `1px solid ${isSelected ? "rgba(224,35,28,0.4)" : T.lineSoft}`,
                          transition: `all .25s ${T.ease}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%",
                            border: `1px solid ${isSelected ? T.vermilion : T.muted}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {isSelected && (
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.vermilion }} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: T.bone, fontWeight: isSelected ? 400 : 300 }}>
                              {mode.name}
                            </div>
                            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                              {mode.desc}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase",
                          padding: "3px 8px", background: "rgba(223,231,224,0.05)",
                          color: isSelected ? T.bone : T.muted,
                        }}>
                          {mode.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={isProcessing || cart.length === 0}
                onClick={handlePlaceOrder}
                style={{
                  width: "100%", padding: "18px 24px",
                  background: isProcessing ? "rgba(223,231,224,0.2)" : T.bone,
                  color: isProcessing ? T.muted : T.ink,
                  border: "none", fontSize: 11, fontWeight: 500, letterSpacing: ".22em",
                  textTransform: "uppercase", cursor: isProcessing ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: `background .3s ${T.ease}`,
                }}
              >
                {isProcessing ? "Authorizing Payment & Recording Order..." : `Authorize Payment & Place Order · $${cartTotal.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
