import React, { useState } from "react";
import { Product, PRODUCTS } from "../data/products";
import { CartItem } from "./CartDrawer";
import { ProductReviews } from "./ProductReviews";

const PRODUCT_DB_ID_MAP: Record<string, number> = {
  keyboard: 1,
  mouse: 2,
  lamp: 3,
  dac: 4,
  macropad: 34,
};

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onSelectProduct: (productId: string) => void;
  cart?: CartItem[];
  onAddToCart?: (product: Product, quantity: number, selectedFinish: string, selectedOption: string) => void;
  onOpenCart?: () => void;
  onOpenOrders?: () => void;
  onOpenSearch?: () => void;
  onOpenCustomer?: () => void;
  totalItemCount?: number;
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

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onSelectProduct,
  onAddToCart,
  onOpenCart,
  onOpenOrders,
  onOpenSearch,
  onOpenCustomer,
  totalItemCount = 0,
}) => {
  const galleryImages = (product.images && product.images.length > 0) ? product.images : [product.image];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [selectedFinish, setSelectedFinish] = useState(product.finishes[0]?.name || "");
  const [selectedOption, setSelectedOption] = useState(product.options?.[0] || "");
  const [quantity, setQuantity] = useState(1);

  React.useEffect(() => {
    setSelectedFinish(product.finishes[0]?.name || "");
    setSelectedOption(product.options?.[0] || "");
    setQuantity(1);
    setActiveImageIndex(0);
    setIsHoveringImage(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [product.id]);

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (galleryImages.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = Math.max(0, Math.min(0.9999, x / rect.width));
    const newIndex = Math.floor(ratio * galleryImages.length);
    setActiveImageIndex(newIndex);
  };

  const handleAddClick = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity, selectedFinish, selectedOption);
    }
  };

  const companions = Object.values(PRODUCTS).filter(p => p.id !== product.id).slice(0, 3);

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: T.ink,
      color: T.bone,
      fontFamily: T.font,
      fontWeight: 300,
      fontSize: "16px",
      lineHeight: 1.6,
      WebkitFontSmoothing: "antialiased",
      overflowX: "hidden",
      position: "relative",
    }}>
      <style>{`
        .pdp-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          outline: none;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #aab4ad;
          cursor: pointer;
          height: 15px;
          line-height: 15px;
          transition: color .3s;
          text-decoration: none;
        }
        .pdp-nav-tx {
          position: relative;
          display: block;
          height: 15px;
          line-height: 15px;
          overflow: hidden;
        }
        .pdp-nav-tx span {
          display: block;
          height: 15px;
          line-height: 15px;
          transition: transform .55s cubic-bezier(.16,1,.3,1), color .3s;
        }
        .pdp-nav-tx .alt {
          position: absolute;
          inset: 0;
          transform: translate3d(0,100%,0);
          color: #dfe7e0;
          letter-spacing: .32em;
        }
        .pdp-nav-link:hover .pdp-nav-tx span {
          transform: translate3d(0,-100%,0);
        }
        .pdp-nav-link:hover .pdp-nav-tx .alt {
          transform: none;
        }
        .pdp-nav-link:hover, .pdp-nav-link.on {
          color: #dfe7e0;
        }
        .pdp-nav-link.on::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 1px;
          background: #e0231c;
        }
        .pdp-nav-cart-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 8px;
          background-color: #e0231c;
          color: #fff;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0;
          line-height: 1;
        }
      `}</style>

      {/* ── grain overlay ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none",
        opacity: 0.04, mixBlendMode: "overlay",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
      }} />

      {/* ── vignette ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 55, pointerEvents: "none",
        background: "radial-gradient(125% 95% at 50% 42%, transparent 40%, rgba(2,4,6,.55) 100%)",
      }} />

      {/* ── nav bar ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: 84, zIndex: 50,
        display: "flex", alignItems: "center", gap: 24,
        padding: "0 clamp(20px, 3.4vw, 56px)",
      }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none",
          background: "rgba(5,7,10,.62)",
          backdropFilter: "blur(14px) saturate(1.1)",
          WebkitBackdropFilter: "blur(14px) saturate(1.1)",
        }} />
        <div style={{
          position: "absolute", left: "clamp(20px,3.4vw,56px)", right: "clamp(20px,3.4vw,56px)",
          bottom: 0, height: 1, background: T.lineSoft,
        }} />

        {/* brand */}
        <a onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", flexShrink: 0 }}>
          <svg viewBox="0 0 44 44" fill="none" width={34} height={34}>
            <circle cx="22" cy="25" r="8.6" fill={T.vermilion} fillOpacity={.9}/>
            <path d="M5 13h34M9 18.4h26M22 8.5v27" stroke={T.bone} strokeWidth="1.5"/>
            <path d="M14 35.5h16" stroke={T.bone} strokeWidth="1.2" strokeOpacity=".6"/>
          </svg>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 3 }}>
            <b style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".26em" }}>KAGE STORE</b>
            <i style={{ fontStyle: "normal", fontSize: 8, letterSpacing: ".34em", color: T.muted }}>SAKURA ATELIER</i>
          </span>
        </a>

        {/* nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "clamp(18px,2.6vw,46px)", marginLeft: "auto" }}>
          <a onClick={onBack} className="pdp-nav-link" data-cursor>
            <span className="pdp-nav-tx"><span>Store</span><span className="alt">店舗</span></span>
          </a>
          <span className="pdp-nav-link on" data-cursor>
            <span className="pdp-nav-tx"><span>{product.category.split(" ")[0]}</span><span className="alt">{product.jpName || "製品"}</span></span>
          </span>
          <button onClick={onOpenSearch} className="pdp-nav-link" data-cursor aria-label="Search Products">
            <span className="pdp-nav-tx"><span>Search</span><span className="alt">検索</span></span>
          </button>
          <button onClick={onOpenOrders} className="pdp-nav-link" data-cursor aria-label="Customer Orders">
            <span className="pdp-nav-tx"><span>Orders</span><span className="alt">注文</span></span>
          </button>
          <button onClick={onOpenCustomer} className="pdp-nav-link" data-cursor aria-label="Customer Profile">
            <span className="pdp-nav-tx"><span>Profile</span><span className="alt">顧客</span></span>
          </button>
          <button onClick={onOpenCart} className="pdp-nav-link pdp-nav-cart" data-cursor aria-label="Shopping Cart">
            <span className="pdp-nav-tx"><span>Cart</span><span className="alt">袋</span></span>
            {totalItemCount > 0 && (
              <span className="pdp-nav-cart-badge">{totalItemCount}</span>
            )}
          </button>
        </nav>
      </header>

      {/* ── page content ── */}
      <main style={{ position: "relative", zIndex: 10, paddingTop: 84 }}>

        {/* breadcrumbs */}
        <div style={{
          padding: "clamp(20px,3vh,40px) clamp(20px,3.4vw,56px)",
          fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
          color: T.boneDim, display: "flex", alignItems: "center", gap: 8,
          textShadow: "0 1px 16px rgba(3,6,8,.9)",
        }}>
          <span style={{ cursor: "pointer" }} onClick={onBack}>Store</span>
          <span style={{ opacity: .4 }}>/</span>
          <span>{product.category}</span>
          <span style={{ opacity: .4 }}>/</span>
          <span style={{ color: T.bone }}>{product.name}</span>
        </div>

        {/* ── hero product section ── */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)",
          gap: "clamp(28px,5vw,90px)",
          padding: "0 clamp(20px,3.4vw,56px) clamp(60px,10vh,120px)",
          alignItems: "start",
        }}>
          {/* image */}
          <div style={{ position: "sticky", top: 100 }}>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                outline: `1px solid ${isHoveringImage ? "rgba(224,35,28,.4)" : T.lineSoft}`,
                outlineOffset: -1,
                transition: `outline-color .5s ${T.ease}`,
                cursor: galleryImages.length > 1 ? "ew-resize" : "default",
                userSelect: "none",
              }}
              onMouseMove={handleImageMouseMove}
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => setIsHoveringImage(false)}
            >
              {/* Stacked Images for instantaneous scrubbing without flicker */}
              {galleryImages.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`${product.name} view ${i + 1}`}
                  style={{
                    position: i === 0 ? "relative" : "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    aspectRatio: "4/3",
                    objectFit: "cover",
                    display: "block",
                    filter: "saturate(.95) brightness(.98)",
                    opacity: i === activeImageIndex ? 1 : 0,
                    transform: isHoveringImage ? "scale(1.025)" : "scale(1)",
                    transition: "opacity .08s ease, transform .7s cubic-bezier(.16,1,.3,1)",
                    pointerEvents: "none",
                  }}
                />
              ))}

              <div style={{
                position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 4,
                display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                pointerEvents: "none",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
                  color: T.boneDim, textShadow: "0 1px 16px rgba(3,6,8,.9)",
                }}>
                  Studio Craft // {product.jpName}
                </span>
                {product.badge && (
                  <span style={{
                    padding: "4px 10px",
                    background: "rgba(224,35,28,.12)", border: "1px solid rgba(224,35,28,.28)",
                    fontSize: 9, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase" as const,
                    color: T.ember,
                  }}>{product.badge}</span>
                )}
              </div>
            </div>

            {/* Thumbnails strip for multi-image products */}
            {galleryImages.length > 1 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${galleryImages.length}, 1fr)`,
                gap: 6,
                marginTop: 8,
              }}>
                {galleryImages.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActiveImageIndex(i)}
                    onMouseEnter={() => setActiveImageIndex(i)}
                    style={{
                      position: "relative",
                      aspectRatio: "16/10",
                      padding: 0,
                      border: `1px solid ${i === activeImageIndex ? T.vermilion : T.lineSoft}`,
                      background: T.ink2,
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: `border-color .3s ${T.ease}, transform .3s ${T.ease}`,
                      transform: i === activeImageIndex ? "translateY(-1px)" : "none",
                    }}
                  >
                    <img
                      src={src}
                      alt={`Thumbnail ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: i === activeImageIndex ? "brightness(1) saturate(1)" : "brightness(.65) saturate(.8)",
                        transition: "filter .3s ease",
                      }}
                    />
                    {i === activeImageIndex && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                        backgroundColor: T.vermilion,
                      }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* trust strip */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1,
              marginTop: 1, background: T.lineSoft,
            }}>
              {[
                ["Precision", "CNC Alloy"],
                ["Delivery", "Complimentary"],
                ["Warranty", "3 Years Studio"],
              ].map(([label, value]) => (
                <div key={label} style={{
                  padding: "16px 14px", background: T.ink, textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const, color: T.muted }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 400, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* details column */}
          <div style={{ paddingTop: 6 }}>
            <h1 style={{
              fontSize: "clamp(30px,4vw,60px)", fontWeight: 400,
              textTransform: "uppercase" as const, lineHeight: 1.055, letterSpacing: "-.012em",
              textShadow: "0 2px 34px rgba(3,6,8,.72)", margin: "0 0 8px",
            }}>
              {product.name}
            </h1>

            <p style={{
              fontSize: "clamp(14px,1.02vw,17px)", lineHeight: 1.72,
              color: "#b4bfb7", fontWeight: 300,
              textShadow: "0 1px 20px rgba(3,6,8,.88)",
              margin: "0 0 20px",
            }}>
              {product.subtitle}
            </p>

            <div style={{
              display: "flex", alignItems: "baseline", gap: 16,
              paddingBottom: 24, borderBottom: `1px solid ${T.lineSoft}`, marginBottom: 28,
            }}>
              <span style={{ fontSize: "clamp(26px,2.5vw,36px)", fontWeight: 300, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>
                {product.priceDisplay}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.68, color: "#9aa5a0", fontWeight: 300 }}>
                {product.isComingSoon ? "Reserve opens soon" : "In stock · Ships in 24h"}
              </span>
            </div>

            <p style={{
              fontSize: 14, lineHeight: 1.68, color: "#9aa5a0", fontWeight: 300,
              textShadow: "0 1px 18px rgba(3,6,8,.85)", margin: "0 0 34px",
            }}>
              {product.description}
            </p>

            {/* finish selector */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
                color: T.boneDim, marginBottom: 12,
              }}>
                <span>Finish</span>
                <span style={{ color: T.bone }}>{selectedFinish}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.finishes.map(f => (
                  <button key={f.name} onClick={() => setSelectedFinish(f.name)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 16px",
                    background: selectedFinish === f.name ? "rgba(224,35,28,.08)" : "transparent",
                    border: `1px solid ${selectedFinish === f.name ? "rgba(224,35,28,.4)" : T.lineSoft}`,
                    fontSize: 13, fontWeight: 300, color: T.bone, cursor: "pointer",
                    transition: `all .35s ${T.ease}`,
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: f.hex, border: `1px solid ${T.line}` }} />
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* option selector */}
            {product.options && (
              <div style={{ marginBottom: 32 }}>
                <div style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
                  color: T.boneDim, marginBottom: 12,
                }}>{product.optionsName}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {product.options.map(opt => (
                    <button key={opt} onClick={() => setSelectedOption(opt)} style={{
                      padding: "12px 16px", textAlign: "left",
                      background: selectedOption === opt ? "rgba(224,35,28,.06)" : "transparent",
                      border: `1px solid ${selectedOption === opt ? "rgba(224,35,28,.35)" : T.lineSoft}`,
                      color: T.bone, fontSize: 13, fontWeight: 300, cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: `all .35s ${T.ease}`,
                    }}>
                      <span>{opt}</span>
                      {selectedOption === opt && <span style={{ color: T.vermilion, fontSize: 12 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* quantity + add to cart */}
            <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
              <div style={{
                display: "flex", alignItems: "center", border: `1px solid ${T.lineSoft}`,
              }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{
                  padding: "14px 16px", fontSize: 16, color: T.bone, cursor: "pointer",
                }}>−</button>
                <span style={{ minWidth: 32, textAlign: "center", fontSize: 14, fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={{
                  padding: "14px 16px", fontSize: 16, color: T.bone, cursor: "pointer",
                }}>+</button>
              </div>

              <button onClick={handleAddClick} style={{
                flex: 1, position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14,
                padding: "17px 30px", border: `1px solid ${T.line}`, borderRadius: 100, overflow: "hidden",
                fontSize: 11, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
                color: T.bone, cursor: "pointer",
                transition: `color .45s ${T.ease}, border-color .45s, background .35s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = T.bone; e.currentTarget.style.color = T.ink; e.currentTarget.style.borderColor = T.bone; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.bone; e.currentTarget.style.borderColor = T.line; }}
              >
                {product.isComingSoon ? "Join Priority Reserve" : "Add to Selection"}
                <svg viewBox="0 0 14 14" fill="none" width={13} height={13}><path d="M3 11 11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.3"/></svg>
              </button>
            </div>

            {/* specifications */}
            <div style={{
              borderTop: `1px solid ${T.lineSoft}`, paddingTop: 28, marginBottom: 32,
            }}>
              <h3 style={{
                fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
                color: T.muted, margin: "0 0 18px",
              }}>Technical Specifications</h3>
              {product.specs.map(spec => (
                <div key={spec.label} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, fontWeight: 300, padding: "10px 0",
                  borderBottom: `1px solid ${T.lineSoft}`,
                }}>
                  <span style={{ color: "#9aa5a0" }}>{spec.label}</span>
                  <span style={{ color: T.bone, fontWeight: 400, textAlign: "right" }}>{spec.value}</span>
                </div>
              ))}
            </div>

            {/* in the box */}
            <div style={{ marginBottom: 40 }}>
              <h3 style={{
                fontSize: 10, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const,
                color: T.muted, margin: "0 0 14px",
              }}>Included in packaging</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#9aa5a0", lineHeight: 1.8, fontWeight: 300 }}>
                {product.inTheBox.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Customer Reviews & Ratings (Review Entity) ── */}
        <div style={{ padding: "0 clamp(20px,3.4vw,56px)" }}>
          <ProductReviews
            key={product.id}
            productId={PRODUCT_DB_ID_MAP[product.id] || 1}
            productName={product.name}
          />
        </div>

        {/* ── companion products ── */}
        <section style={{
          padding: "clamp(50px,8vh,96px) clamp(20px,3.4vw,56px)",
          borderTop: `1px solid ${T.lineSoft}`,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: "clamp(30px,5vh,66px)",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".24em", textTransform: "uppercase" as const, color: T.muted }}>
                <b style={{ color: T.vermilion, fontWeight: 500 }}>→</b> Sanctuary Collection
              </span>
              <span style={{ flex: "1 1 auto", height: 1, background: T.lineSoft, minWidth: 40 }} />
            </div>
            <a onClick={onBack} style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              fontSize: 11, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase" as const,
              color: T.bone, cursor: "pointer",
            }}>
              View all
              <svg viewBox="0 0 14 14" fill="none" width={12} height={12}><path d="M3 11 11 3M5 3h6v6" stroke={T.bone} strokeWidth="1.3"/></svg>
            </a>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)",
            gap: "clamp(10px,1.4vw,22px)", alignItems: "start",
          }}>
            {companions.map((c, i) => (
              <article key={c.id} onClick={() => onSelectProduct(c.id)} style={{
                position: "relative", cursor: "pointer",
                transform: `translateY(${i * 40}px)`,
              }}>
                <div style={{
                  position: "relative", aspectRatio: "4/5",
                  backgroundImage: `linear-gradient(180deg,rgba(3,6,9,.04) 36%,rgba(3,6,9,.72) 100%),url(${c.image})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  outline: `1px solid ${T.lineSoft}`, outlineOffset: -1,
                  transition: `outline-color .5s ${T.ease}`,
                  overflow: "hidden",
                }}
                  onMouseEnter={e => (e.currentTarget.style.outlineColor = "rgba(223,231,224,.30)")}
                  onMouseLeave={e => (e.currentTarget.style.outlineColor = T.lineSoft)}
                >
                  <div style={{
                    position: "absolute", left: 16, right: 16, bottom: 14, zIndex: 2,
                    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                  }}>
                    <div>
                      <b style={{ fontSize: 14, fontWeight: 500, display: "block" }}>{c.name.split(" ").slice(0,2).join(" ")}</b>
                      <span style={{ fontSize: 11, color: T.boneDim, fontWeight: 300 }}>{c.jpName}</span>
                    </div>
                    <svg viewBox="0 0 14 14" fill="none" width={14} height={14}><path d="M3 11 11 3M5 3h6v6" stroke={T.bone} strokeWidth="1.3"/></svg>
                  </div>
                  <div style={{
                    position: "absolute", left: 0, right: 0, bottom: 0, height: "60%",
                    background: "linear-gradient(transparent 0%, rgba(4,6,9,.80) 100%)",
                    pointerEvents: "none",
                  }} />
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 2px",
                  fontSize: 12, fontWeight: 300, color: T.muted,
                }}>
                  <span>{c.priceDisplay}</span>
                  <span>{String(i + 1).padStart(2, "0")} / {String(companions.length).padStart(2, "0")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── footer ── */}
        <footer style={{
          position: "relative",
          padding: "clamp(50px,8vh,96px) clamp(20px,3.4vw,56px) clamp(26px,4vh,40px)",
          borderTop: `1px solid ${T.lineSoft}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <svg viewBox="0 0 44 44" fill="none" width={28} height={28}>
                <circle cx="22" cy="25" r="8.6" fill={T.vermilion} fillOpacity={.9}/>
                <path d="M5 13h34M9 18.4h26M22 8.5v27" stroke={T.bone} strokeWidth="1.5"/>
              </svg>
              <p style={{ fontSize: 13, color: "#8f9a93", maxWidth: "36ch", margin: 0 }}>
                Bespoke sakura workspace hardware, precision-made for quiet focus.
              </p>
            </div>
            <span style={{ fontSize: 12, color: T.muted }}>© 2026 Kage Store</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

const navLinkStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase",
  color: "#aab4ad", cursor: "pointer",
};
