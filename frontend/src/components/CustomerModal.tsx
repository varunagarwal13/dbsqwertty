import React, { useState, useEffect } from "react";
import { api, DBCustomer } from "../services/api";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerChanged?: (customerId: string) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "switch" | "register">("profile");
  const [customer, setCustomer] = useState<DBCustomer | null>(null);
  const [allCustomers, setAllCustomers] = useState<DBCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Edit form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Register form state
  const [newId, setNewId] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("Tokyo");

  const loadData = async () => {
    setLoading(true);
    try {
      const [curr, all] = await Promise.all([
        api.fetchCustomer(),
        api.fetchAllCustomers(),
      ]);
      setCustomer(curr);
      setAllCustomers(all);
      if (curr) {
        setFirstName(curr.first_name || "");
        setLastName(curr.last_name || "");
        setPhoneNo(curr.phone_no || "");
        setHouseNo(curr.house_no || "");
        setStreet(curr.street || "");
        setCity(curr.city || "");
        setState(curr.state || "");
        setPincode(curr.pincode || "");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      await api.updateCustomer({
        customer_id: customer.customer_id,
        first_name: firstName,
        last_name: lastName,
        phone_no: phoneNo,
        house_no: houseNo,
        street: street,
        city: city,
        state: state,
        pincode: pincode,
      });
      setStatusMessage("Profile & shipping address synced with Oracle Database!");
      setTimeout(() => setStatusMessage(null), 3500);
      loadData();
    } catch {
      setStatusMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchCustomer = (id: string) => {
    api.setActiveCustomerId(id);
    if (onCustomerChanged) onCustomerChanged(id);
    setStatusMessage(`Switched active session to Customer ${id}`);
    loadData();
    setTimeout(() => {
      setStatusMessage(null);
      setActiveTab("profile");
    }, 1200);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newEmail.trim()) return;
    setSaving(true);
    try {
      await api.createCustomer({
        customer_id: newId.trim(),
        first_name: newFirst.trim() || "Guest",
        last_name: newLast.trim() || "User",
        email: newEmail.trim(),
        phone_no: newPhone.trim(),
        city: newCity.trim(),
      });
      if (onCustomerChanged) onCustomerChanged(newId.trim());
      setStatusMessage(`Customer ${newId} registered and activated with an active cart!`);
      setNewId("");
      setNewFirst("");
      setNewLast("");
      setNewEmail("");
      setNewPhone("");
      loadData();
      setTimeout(() => {
        setStatusMessage(null);
        setActiveTab("profile");
      }, 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120,
      backgroundColor: "rgba(5,7,10,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 680, maxHeight: "90vh",
        backgroundColor: "#0a0e12", border: "1px solid rgba(223,231,224,0.18)",
        borderRadius: 4, display: "flex", flexDirection: "column",
        boxShadow: "0 25px 60px rgba(0,0,0,0.85)", overflow: "hidden",
        fontFamily: "'Onest',system-ui,sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid rgba(223,231,224,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#e0231c", fontSize: 16 }}>●</span>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: "#dfe7e0" }}>
                Customer Account &amp; Profile
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 24px", fontSize: 11, color: "#78837c", letterSpacing: ".05em" }}>
              Oracle DB Entity: <code style={{ color: "#aab4ad" }}>Customer</code> &amp; <code style={{ color: "#aab4ad" }}>Cart</code> (1:1 Ownership)
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "#aab4ad",
            fontSize: 18, cursor: "pointer", padding: "4px 8px",
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", borderBottom: "1px solid rgba(223,231,224,0.1)",
          backgroundColor: "rgba(10,14,18,0.5)",
        }}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              flex: 1, padding: "12px 16px", background: "none", border: "none",
              borderBottom: activeTab === "profile" ? "2px solid #e0231c" : "2px solid transparent",
              color: activeTab === "profile" ? "#dfe7e0" : "#78837c",
              fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
              cursor: "pointer", transition: "all .2s ease",
            }}
          >
            Profile &amp; Address
          </button>
          <button
            onClick={() => setActiveTab("switch")}
            style={{
              flex: 1, padding: "12px 16px", background: "none", border: "none",
              borderBottom: activeTab === "switch" ? "2px solid #e0231c" : "2px solid transparent",
              color: activeTab === "switch" ? "#dfe7e0" : "#78837c",
              fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
              cursor: "pointer", transition: "all .2s ease",
            }}
          >
            Switch Account ({allCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab("register")}
            style={{
              flex: 1, padding: "12px 16px", background: "none", border: "none",
              borderBottom: activeTab === "register" ? "2px solid #e0231c" : "2px solid transparent",
              color: activeTab === "register" ? "#dfe7e0" : "#78837c",
              fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
              cursor: "pointer", transition: "all .2s ease",
            }}
          >
            + Register New
          </button>
        </div>

        {/* Notification Banner */}
        {statusMessage && (
          <div style={{
            padding: "10px 24px", backgroundColor: "rgba(224,35,28,0.12)",
            borderBottom: "1px solid rgba(224,35,28,0.3)", color: "#dfe7e0",
            fontSize: 12, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: "#e0231c" }}>✓</span> {statusMessage}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#78837c", fontSize: 13 }}>
              Loading Customer data from Oracle XE...
            </div>
          ) : activeTab === "profile" && customer ? (
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Account Meta Card */}
              <div style={{
                padding: 14, backgroundColor: "rgba(223,231,224,0.03)",
                border: "1px solid rgba(223,231,224,0.08)", borderRadius: 3,
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
              }}>
                <div>
                  <span style={{ fontSize: 10, color: "#78837c", textTransform: "uppercase", letterSpacing: ".1em" }}>Customer ID (PK)</span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#dfe7e0", fontFamily: "monospace", marginTop: 2 }}>
                    {customer.customer_id}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#78837c", textTransform: "uppercase", letterSpacing: ".1em" }}>Registered Email (UK)</span>
                  <div style={{ fontSize: 12, color: "#aab4ad", marginTop: 2 }}>{customer.email}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#78837c", textTransform: "uppercase", letterSpacing: ".1em" }}>Registration Date</span>
                  <div style={{ fontSize: 11, color: "#78837c", marginTop: 2 }}>
                    {customer.registration_date ? new Date(customer.registration_date).toLocaleDateString() : "Active Member"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#78837c", textTransform: "uppercase", letterSpacing: ".1em" }}>Active Cart State</span>
                  <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 500, marginTop: 2 }}>● 1:1 Active Cart Attached</div>
                </div>
              </div>

              {/* Editable Personal Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                      borderRadius: 2, color: "#dfe7e0", fontSize: 12, outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                      borderRadius: 2, color: "#dfe7e0", fontSize: 12, outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Phone Number (Contact)</label>
                <input
                  type="text"
                  value={phoneNo}
                  onChange={e => setPhoneNo(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  style={{
                    width: "100%", padding: "9px 12px", boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                    borderRadius: 2, color: "#dfe7e0", fontSize: 12, outline: "none",
                  }}
                />
              </div>

              {/* Delivery Address (Composite Attribute) */}
              <div style={{ borderTop: "1px solid rgba(223,231,224,0.1)", paddingTop: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#dfe7e0" }}>
                  Delivery Address (Composite Attribute)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder="House / Unit No"
                    value={houseNo}
                    onChange={e => setHouseNo(e.target.value)}
                    style={{
                      padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(223,231,224,0.15)", borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Street / Avenue Address"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    style={{
                      padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(223,231,224,0.15)", borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    style={{
                      padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(223,231,224,0.15)", borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="State / Prefecture"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    style={{
                      padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(223,231,224,0.15)", borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Pincode / Postal"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    style={{
                      padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(223,231,224,0.15)", borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: 6, padding: "12px", backgroundColor: "#e0231c",
                  border: "none", borderRadius: 2, color: "#fff",
                  fontSize: 11, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase",
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                  transition: "background .2s ease",
                }}
              >
                {saving ? "Saving to Oracle DB..." : "Save Profile & Address"}
              </button>
            </form>
          ) : activeTab === "switch" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#78837c" }}>
                Select an account to load their persistent cart, historical orders, and address records:
              </p>
              {allCustomers.map(c => {
                const isCurrent = customer && customer.customer_id === c.customer_id;
                return (
                  <div
                    key={c.customer_id}
                    onClick={() => handleSwitchCustomer(c.customer_id)}
                    style={{
                      padding: "12px 16px", backgroundColor: isCurrent ? "rgba(224,35,28,0.08)" : "rgba(223,231,224,0.02)",
                      border: isCurrent ? "1px solid #e0231c" : "1px solid rgba(223,231,224,0.08)",
                      borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", transition: "all .2s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#dfe7e0" }}>
                          {c.first_name} {c.last_name}
                        </span>
                        <code style={{ fontSize: 11, color: isCurrent ? "#e0231c" : "#aab4ad", backgroundColor: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 2 }}>
                          {c.customer_id}
                        </code>
                        {isCurrent && (
                          <span style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "#e0231c", border: "1px solid #e0231c", padding: "1px 5px", borderRadius: 10 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#78837c", marginTop: 4 }}>
                        {c.email} {c.city ? `• ${c.city}` : ""}
                      </div>
                    </div>
                    <button style={{
                      background: isCurrent ? "#e0231c" : "rgba(223,231,224,0.1)",
                      border: "none", color: "#fff", padding: "6px 12px",
                      fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase",
                      borderRadius: 2, cursor: "pointer",
                    }}>
                      {isCurrent ? "Active" : "Select"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#78837c" }}>
                Register a new customer account. The database triggers will provision an <code style={{ color: "#aab4ad" }}>ACTIVE</code> cart automatically:
              </p>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Customer ID (Unique PK)</label>
                <input
                  type="text"
                  placeholder="e.g. 25BYB0200"
                  value={newId}
                  onChange={e => setNewId(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "9px 12px", boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                    borderRadius: 2, color: "#dfe7e0", fontSize: 12, outline: "none", fontFamily: "monospace",
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>First Name</label>
                  <input
                    type="text"
                    value={newFirst}
                    onChange={e => setNewFirst(e.target.value)}
                    required
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                      borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Last Name</label>
                  <input
                    type="text"
                    value={newLast}
                    onChange={e => setNewLast(e.target.value)}
                    required
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                      borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Email (Unique UK)</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "9px 12px", boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                    borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                      borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#aab4ad", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", boxSizing: "border-box",
                      backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(223,231,224,0.15)",
                      borderRadius: 2, color: "#dfe7e0", fontSize: 12,
                    }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: 6, padding: "12px", backgroundColor: "#e0231c",
                  border: "none", borderRadius: 2, color: "#fff",
                  fontSize: 11, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Registering..." : "Complete Registration"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
