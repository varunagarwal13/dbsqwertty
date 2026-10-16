import React, { useEffect, useState } from "react";
import { api, DBOrder, OrderLifecycleState, CURRENT_CUSTOMER_ID } from "../services/api";

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
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

const PROGRESS_STEPS: { key: OrderLifecycleState; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATE_COLORS: Record<OrderLifecycleState, { bg: string; border: string; text: string }> = {
  PENDING: { bg: "rgba(241,196,15,0.12)", border: "#f1c40f", text: "#f39c12" },
  PROCESSING: { bg: "rgba(52,152,219,0.12)", border: "#3498db", text: "#2980b9" },
  SHIPPED: { bg: "rgba(155,89,182,0.12)", border: "#9b59b6", text: "#8e44ad" },
  DELIVERED: { bg: "rgba(46,204,113,0.12)", border: "#2ecc71", text: "#27ae60" },
  CANCELLED: { bg: "rgba(231,76,60,0.12)", border: "#e74c3c", text: "#c0392b" },
};

export const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.fetchOrders()
        .then((data) => setOrders(data))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 170,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.font, fontWeight: 300,
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(3, 5, 8, 0.85)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "relative",
        width: "min(780px, 94vw)",
        height: "85vh",
        backgroundColor: T.ink2,
        border: `1px solid ${T.line}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        zIndex: 171,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "24px 30px", borderBottom: `1px solid ${T.lineSoft}`,
          background: T.ink,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: T.vermilion, fontSize: 13 }}>◆</span>
              <h2 style={{
                fontSize: 12, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase",
                color: T.bone, margin: 0,
              }}>
                Sales Orders &amp; Order Lines
              </h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: T.muted }}>
              Oracle SQL Tables: Order_Tab · Order_Item · Payment (Customer #{CURRENT_CUSTOMER_ID})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.boneDim, fontSize: 14,
              border: `1px solid ${T.lineSoft}`, borderRadius: "50%",
              background: "transparent",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div style={{ padding: "26px 30px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
              Querying Order_Tab &amp; Payment records...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>📦</div>
              <h3 style={{ fontSize: 16, color: T.bone, fontWeight: 400, margin: "0 0 6px" }}>
                No Orders Placed Yet
              </h3>
              <p style={{ fontSize: 12, color: T.muted }}>
                Add items to your cart and proceed to checkout to generate orders and payments.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const style = STATE_COLORS[order.order_status] || STATE_COLORS.PROCESSING;
              return (
                <div
                  key={order.order_id}
                  style={{
                    background: T.ink, border: `1px solid ${T.lineSoft}`,
                    padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18,
                  }}
                >
                  {/* Top order summary */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: T.bone }}>
                          Order #ORD-{order.order_id}
                        </span>
                        {/* Lifecycle state badge */}
                        <span style={{
                          padding: "3px 10px", fontSize: 10, fontWeight: 600,
                          letterSpacing: ".15em", textTransform: "uppercase",
                          background: style.bg, border: `1px solid ${style.border}`, color: style.text,
                        }}>
                          {order.order_status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                        Placed on {new Date(order.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".12em", display: "block" }}>
                        Total Amount Paid
                      </span>
                      <span style={{ fontSize: 18, color: T.bone, fontWeight: 400 }}>
                        ${order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Record Section */}
                  <div style={{
                    padding: "12px 16px", background: "rgba(223,231,224,0.02)",
                    border: `1px solid ${T.lineSoft}`, display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12,
                    fontSize: 12,
                  }}>
                    <div>
                      <span style={{ color: T.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", display: "block" }}>
                        Settlement Mode
                      </span>
                      <span style={{ color: T.bone, fontWeight: 400 }}>{order.payment_mode || "Test Wallet"}</span>
                    </div>
                    <div>
                      <span style={{ color: T.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", display: "block" }}>
                        Gateway Status
                      </span>
                      <span style={{ color: "#5CB57A", fontWeight: 500 }}>
                        ✓ {order.payment_status || "COMPLETED"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: T.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", display: "block" }}>
                        Amount Paid
                      </span>
                      <span style={{ color: T.bone }}>${order.total_amount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span style={{ color: T.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", display: "block" }}>
                        Payment Ref ID
                      </span>
                      <span style={{ color: T.boneDim }}>PAY-#{order.payment_id || order.order_id * 2}</span>
                    </div>
                  </div>

                  {/* Order Lines (Order_Item) */}
                  <div>
                    <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".15em", display: "block", marginBottom: 8 }}>
                      Order Lines ({order.items?.length || 0} items)
                    </span>
                    <div style={{ border: `1px solid ${T.lineSoft}`, background: T.ink2 }}>
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 16px", borderBottom: idx < (order.items.length - 1) ? `1px solid ${T.lineSoft}` : "none",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ color: T.boneDim }}>
                            <strong style={{ color: T.bone, fontWeight: 400 }}>{item.product_name}</strong>
                            <span style={{ color: T.muted, marginLeft: 8 }}>Qty: {item.quantity}</span>
                          </div>
                          <div style={{ color: T.bone }}>
                            ${(item.unit_price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Lifecycle Progress Tracker (Read-only status for customer) */}
                  <div style={{
                    borderTop: `1px solid ${T.lineSoft}`, paddingTop: 16,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".15em" }}>
                        Order Lifecycle Status
                      </span>
                      <span style={{ fontSize: 11, color: style.text, fontWeight: 500 }}>
                        Current Stage: {order.order_status}
                      </span>
                    </div>

                    {order.order_status === "CANCELLED" ? (
                      <div style={{
                        padding: "10px 14px", background: "rgba(231,76,60,0.08)",
                        border: "1px solid rgba(231,76,60,0.3)", color: "#e74c3c",
                        fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span>✕</span> This order has been cancelled and is no longer being processed.
                      </div>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", position: "relative",
                        width: "100%", padding: "4px 8px 10px",
                      }}>
                        {PROGRESS_STEPS.map((step, idx) => {
                          const currentStepIdx = PROGRESS_STEPS.findIndex(s => s.key === order.order_status);
                          const isCompleted = idx < currentStepIdx;
                          const isCurrent = idx === currentStepIdx;

                          return (
                            <React.Fragment key={step.key}>
                              <div style={{
                                display: "flex", flexDirection: "column", alignItems: "center",
                                position: "relative", zIndex: 2,
                              }}>
                                <div style={{
                                  width: 22, height: 22, borderRadius: "50%",
                                  background: isCurrent ? T.bone : isCompleted ? "#5CB57A" : T.ink,
                                  border: `1.5px solid ${isCurrent ? T.bone : isCompleted ? "#5CB57A" : "rgba(223,231,224,0.18)"}`,
                                  color: isCurrent ? T.ink : isCompleted ? "#fff" : T.muted,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 10, fontWeight: 600,
                                  boxShadow: isCurrent ? "0 0 10px rgba(223,231,224,0.35)" : "none",
                                }}>
                                  {isCompleted ? "✓" : isCurrent ? "●" : idx + 1}
                                </div>
                                <span style={{
                                  fontSize: 10, marginTop: 6,
                                  fontWeight: isCurrent ? 500 : 300,
                                  color: isCurrent ? T.bone : isCompleted ? "#5CB57A" : T.muted,
                                  letterSpacing: ".1em", textTransform: "uppercase",
                                }}>
                                  {step.label}
                                </span>
                              </div>

                              {idx < PROGRESS_STEPS.length - 1 && (
                                <div style={{
                                  flex: 1, height: 2, margin: "0 8px 18px",
                                  background: idx < currentStepIdx ? "#5CB57A" : "rgba(223,231,224,0.12)",
                                }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
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
