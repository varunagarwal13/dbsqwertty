import React, { useEffect, useState } from "react";
import { api, DBReview, CURRENT_CUSTOMER_ID } from "../services/api";

interface ProductReviewsProps {
  productId: number;
  productName: string;
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
  gold: "#f5a623",
  font: "'Onest',system-ui,-apple-system,'Helvetica Neue',sans-serif",
  ease: "cubic-bezier(.22,.61,.36,1)",
};

const PRODUCT_NAMES: Record<number, string> = {
  1: "Axis Mechanical Keyboard",
  2: "Arc Wireless Mouse",
  3: "Halo Desk Light",
  4: "Orbit USB-C Hub",
  34: "Link USB-C Cable",
};

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const [reviews, setReviews] = useState<DBReview[]>([]);
  const [allReviews, setAllReviews] = useState<DBReview[]>([]);
  const [filterMode, setFilterMode] = useState<"this" | "all">("this");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadReviews = () => {
    // 1. Load reviews specifically for this product
    api.fetchReviews(productId).then(data => {
      setReviews(data);
    });
    // 2. Also load all reviews so user can toggle view
    api.fetchReviews().then(data => {
      setAllReviews(data);
    });
  };

  useEffect(() => {
    loadReviews();
    const handleUpdate = () => loadReviews();
    window.addEventListener("REVIEWS_UPDATED", handleUpdate);
    return () => window.removeEventListener("REVIEWS_UPDATED", handleUpdate);
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      await api.submitReview(productId, rating, commentText.trim());
      setCommentText("");
      setShowForm(false);
      setStatusMessage("✓ Review saved to Oracle SQL Database (Review table) & synchronized!");
      setTimeout(() => setStatusMessage(null), 4000);
      loadReviews();
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedReviews = filterMode === "this" ? reviews : allReviews;
  const reviewCount = displayedReviews.length;
  const avgRating = reviewCount > 0
    ? (displayedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
    : "5.0";

  return (
    <section style={{
      borderTop: `1px solid ${T.lineSoft}`,
      padding: "clamp(40px, 6vh, 80px) 0 40px",
      fontFamily: T.font,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        flexWrap: "wrap", gap: 16, marginBottom: 28,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ color: T.vermilion, fontSize: 13 }}>★</span>
            <h3 style={{
              fontSize: 11, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase",
              color: T.muted, margin: 0,
            }}>
              Customer Reviews &amp; Ratings · {productName}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: "clamp(28px,3vw,36px)", fontWeight: 300, color: T.bone }}>
              {avgRating}
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: T.gold, fontSize: 16, letterSpacing: 2 }}>
                {"★".repeat(Math.min(5, Math.max(1, Math.round(Number(avgRating)))))}
                {"☆".repeat(Math.max(0, 5 - Math.min(5, Math.max(1, Math.round(Number(avgRating))))))}
              </div>
              <span style={{ fontSize: 11, color: T.muted }}>
                {reviewCount} verified customer {reviewCount === 1 ? "review" : "reviews"} · Review Entity
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{
            display: "inline-flex", background: T.ink,
            border: `1px solid ${T.lineSoft}`, padding: 2,
          }}>
            <button
              onClick={() => setFilterMode("this")}
              style={{
                padding: "6px 12px", border: "none",
                background: filterMode === "this" ? "rgba(223,231,224,0.12)" : "transparent",
                color: filterMode === "this" ? T.bone : T.muted,
                fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              This Product ({reviews.length})
            </button>
            <button
              onClick={() => setFilterMode("all")}
              style={{
                padding: "6px 12px", border: "none",
                background: filterMode === "all" ? "rgba(223,231,224,0.12)" : "transparent",
                color: filterMode === "all" ? T.bone : T.muted,
                fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              All Reviews ({allReviews.length})
            </button>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "10px 20px", background: showForm ? "transparent" : "rgba(223,231,224,0.06)",
              color: T.bone, border: `1px solid ${T.line}`, borderRadius: 100,
              fontSize: 10, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase",
              cursor: "pointer", transition: `all .3s ${T.ease}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.bone; e.currentTarget.style.color = T.ink; }}
            onMouseLeave={e => { e.currentTarget.style.background = showForm ? "transparent" : "rgba(223,231,224,0.06)"; e.currentTarget.style.color = T.bone; }}
          >
            {showForm ? "✕ Cancel" : "+ Write a Review"}
          </button>
        </div>
      </div>

      {/* Success Status Banner */}
      {statusMessage && (
        <div style={{
          padding: "12px 18px", background: "rgba(92,181,122,0.12)",
          border: "1px solid #5CB57A", color: "#5CB57A",
          fontSize: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
        }}>
          {statusMessage}
        </div>
      )}

      {/* Review Form Drawer */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: T.ink2, border: `1px solid ${T.line}`,
            padding: "24px", marginBottom: 36, display: "flex", flexDirection: "column", gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.bone, textTransform: "uppercase", letterSpacing: ".15em" }}>
              Submit Review for {productName}
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>
              Reviewer ID: <code style={{ color: T.vermilion }}>{CURRENT_CUSTOMER_ID}</code> (Varun Agarwal)
            </span>
          </div>

          {/* Interactive Star Rating */}
          <div>
            <span style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6 }}>
              Select Rating (1 to 5 Stars):
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 26, padding: 0,
                    color: (hoverRating || rating) >= star ? T.gold : "rgba(223,231,224,0.2)",
                    transition: "transform .15s ease",
                  }}
                >
                  ★
                </button>
              ))}
              <span style={{ alignSelf: "center", fontSize: 12, color: T.boneDim, marginLeft: 8 }}>
                {rating} out of 5 stars
              </span>
            </div>
          </div>

          {/* Comment text */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6 }}>
              Your Feedback (Comment_Text in Oracle DB):
            </label>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={`Share your review of the ${productName} (tactile feel, performance, build quality)...`}
              style={{
                width: "100%", padding: "12px 14px", background: T.ink,
                border: `1px solid ${T.lineSoft}`, color: T.bone,
                fontSize: 13, fontFamily: T.font, fontWeight: 300,
                outline: "none", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: "10px 18px", background: "transparent",
                border: `1px solid ${T.lineSoft}`, color: T.muted,
                fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              style={{
                padding: "10px 22px", background: T.bone,
                border: "none", color: T.ink, fontWeight: 500,
                fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Submitting to Database..." : "Submit Review"}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {displayedReviews.length === 0 ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: T.muted, fontSize: 13 }}>
            No customer reviews yet for this product. Be the first to share your feedback!
          </div>
        ) : (
          displayedReviews.map((rev) => (
            <div
              key={`${rev.review_id}-${rev.product_id}-${rev.review_date}`}
              style={{
                background: T.ink2, border: `1px solid ${T.lineSoft}`,
                padding: "18px 22px", display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: T.gold, fontSize: 14, letterSpacing: 2 }}>
                    {"★".repeat(Math.min(5, Math.max(1, rev.rating)))}
                    {"☆".repeat(Math.max(0, 5 - Math.min(5, Math.max(1, rev.rating))))}
                  </div>
                  <strong style={{ fontSize: 13, color: T.bone, fontWeight: 500 }}>
                    {rev.customer_name || "Verified Customer"}
                  </strong>
                  <span style={{ fontSize: 10, color: T.muted }}>
                    (ID: {rev.customer_id})
                  </span>
                  {filterMode === "all" && (
                    <span style={{
                      fontSize: 10, padding: "2px 8px", background: "rgba(224,35,28,0.12)",
                      border: "1px solid rgba(224,35,28,0.3)", color: T.vermilion,
                    }}>
                      {PRODUCT_NAMES[rev.product_id] || `Product #${rev.product_id}`}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: T.muted }}>
                  {new Date(rev.review_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p style={{
                margin: "4px 0 0", fontSize: 13, color: T.boneDim, lineHeight: 1.6, fontWeight: 300,
              }}>
                {rev.comment_text}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
