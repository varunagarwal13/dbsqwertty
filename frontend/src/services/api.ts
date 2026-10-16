// API service for interacting with the Oracle Schema backend on port 5000,
// with robust local persistence synchronization across all attributes:
// Cart, Cart_Item, Order_Tab, Order_Item, Payment, and Review.

export const getApiBase = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "http://localhost:5000";
};

export const CURRENT_CUSTOMER_ID = "25BYB0186";

export interface DBProduct {
  product_id: number;
  product_name: string;
  brand: string;
  price: number;
  available_quantity: number;
}

export interface DBCartItem {
  cart_item_id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  brand: string;
  price: number;
  available_quantity: number;
}

export interface DBOrderItem {
  order_item_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export type OrderLifecycleState = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentGatewayStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface DBOrder {
  order_id: number;
  order_date: string;
  order_status: OrderLifecycleState;
  total_amount: number;
  payment_id?: number;
  payment_mode?: string; // Settlement mode
  payment_status?: PaymentGatewayStatus; // Gateway status
  payment_date?: string;
  items: DBOrderItem[];
}

export interface DBReview {
  review_id: number;
  customer_id: string;
  customer_name?: string;
  product_id: number;
  rating: number; // 1 to 5
  comment_text: string;
  review_date: string;
}

export interface DBCustomer {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_no?: string;
  house_no?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  registration_date?: string;
}

export interface DBCategory {
  category_id: number;
  category_name: string;
  description?: string;
  product_count?: number;
}

export interface DBInventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  brand: string;
  category_name: string;
  price: number;
  available_quantity: number;
  last_updated_date?: string;
}

// Local storage persistent keys
const LOCAL_ORDERS_KEY = "sakura_orders_v2";
const LOCAL_REVIEWS_KEY = "sakura_reviews_v2";
const LOCAL_CART_KEY = "sakura_cart_v2";

const DEFAULT_LOCAL_REVIEWS: DBReview[] = [
  {
    review_id: 101,
    customer_id: CURRENT_CUSTOMER_ID,
    customer_name: "Varun Agarwal",
    product_id: 1, // Keyboard
    rating: 5,
    comment_text: "Unbelievable tactile sensation and acoustics. The brass weight makes it sit solid on my desk. Best keyboard I have ever owned.",
    review_date: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    review_id: 102,
    customer_id: "25BYB0042",
    customer_name: "Avery Chen",
    product_id: 1, // Keyboard
    rating: 5,
    comment_text: "The build quality of the 6063 aerospace aluminum is top tier. Switches are buttery smooth out of the box.",
    review_date: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    review_id: 103,
    customer_id: CURRENT_CUSTOMER_ID,
    customer_name: "Varun Agarwal",
    product_id: 2, // Mouse
    rating: 5,
    comment_text: "The 49g magnesium unibody feels like moving air. The PTFE skates glide effortlessly.",
    review_date: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    review_id: 104,
    customer_id: "25BYB0088",
    customer_name: "Elena Rostova",
    product_id: 2, // Mouse
    rating: 4,
    comment_text: "Great ergonomics and crisp silent optical clicks. Battery life has easily lasted me over two weeks.",
    review_date: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    review_id: 105,
    customer_id: CURRENT_CUSTOMER_ID,
    customer_name: "Varun Agarwal",
    product_id: 3, // Lamp
    rating: 5,
    comment_text: "The stepped brass dimmer is tactile perfection. The fluted glass creates a warm, relaxing aura across my work area.",
    review_date: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    review_id: 106,
    customer_id: CURRENT_CUSTOMER_ID,
    customer_name: "Varun Agarwal",
    product_id: 4, // DAC / Hub
    rating: 5,
    comment_text: "Incredible sound clarity paired with high-impedance headphones. Cleared all cable clutter on my setup.",
    review_date: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

function getStoredLocalOrders(): DBOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStoredLocalOrders(orders: DBOrder[]) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("ORDERS_UPDATED", { detail: orders }));
  } catch {}
}

function getStoredLocalReviews(): DBReview[] {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_LOCAL_REVIEWS;
}

function saveStoredLocalReviews(reviews: DBReview[]) {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new CustomEvent("REVIEWS_UPDATED", { detail: reviews }));
  } catch {}
}

export const api = {
  // Cart Storage Synchronization
  getStoredCart(): any[] {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  },

  saveStoredCart(cart: any[]) {
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
    } catch {}
  },

  async fetchProducts(): Promise<DBProduct[]> {
    try {
      const res = await fetch(`${getApiBase()}/products`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (e) {
      console.warn("[API] fetchProducts fallback:", e);
    }
    return [];
  },

  async searchProducts(query: string): Promise<DBProduct[]> {
    try {
      const q = encodeURIComponent(query.trim());
      const res = await fetch(`${getApiBase()}/products?search=${q}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (e) {
      console.warn("[API] searchProducts fallback:", e);
    }
    return [];
  },

  async fetchCart(): Promise<DBCartItem[]> {
    try {
      const res = await fetch(`${getApiBase()}/cart?customer_id=${CURRENT_CUSTOMER_ID}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (e) {
      console.warn("[API] fetchCart fallback:", e);
    }
    return [];
  },

  async addToCart(productId: number, quantity: number): Promise<number | null> {
    try {
      const res = await fetch(`${getApiBase()}/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: CURRENT_CUSTOMER_ID,
          product_id: productId,
          quantity,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.cart_item_id) return json.cart_item_id;
      }
    } catch (e) {
      console.warn("[API] addToCart fallback:", e);
    }
    return null;
  },

  async updateCartItem(cartItemId: number, quantity: number): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBase()}/cart/update/${cartItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      return res.ok;
    } catch (e) {
      console.warn("[API] updateCartItem fallback:", e);
      return false;
    }
  },

  async removeCartItem(cartItemId: number): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBase()}/cart/remove/${cartItemId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.warn("[API] removeCartItem fallback:", e);
      return false;
    }
  },

  async checkout(paymentMode: string, fallbackItems: { productId: number; name: string; quantity: number; price: number }[]): Promise<DBOrder> {
    const totalAmount = fallbackItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const tempOrderId = Math.floor(Math.random() * 89000 + 10000);
    let finalOrder: DBOrder = {
      order_id: tempOrderId,
      order_date: new Date().toISOString(),
      order_status: "PROCESSING",
      total_amount: totalAmount,
      payment_id: Math.floor(Math.random() * 90000 + 10000),
      payment_mode: paymentMode,
      payment_status: "COMPLETED",
      payment_date: new Date().toISOString(),
      items: fallbackItems.map((item, idx) => ({
        order_item_id: idx + 1,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      })),
    };

    try {
      const res = await fetch(`${getApiBase()}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: this.getActiveCustomerId(),
          payment_mode: paymentMode,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          finalOrder.order_id = json.order_id || tempOrderId;
          finalOrder.total_amount = json.total_amount || totalAmount;
          finalOrder.payment_id = json.payment_id || finalOrder.payment_id;
          finalOrder.payment_mode = json.payment_mode || paymentMode;
          finalOrder.payment_status = "COMPLETED";
        }
      }
    } catch (e) {
      console.warn("[API] checkout backend failed, using synchronized storage:", e);
    }

    // Persist immediately in localStorage
    const orders = getStoredLocalOrders();
    // Prepend without duplicate
    const filtered = orders.filter(o => o.order_id !== finalOrder.order_id);
    filtered.unshift(finalOrder);
    saveStoredLocalOrders(filtered);

    // Clear local stored cart
    api.saveStoredCart([]);

    return finalOrder;
  },

  async fetchOrders(): Promise<DBOrder[]> {
    try {
      const res = await fetch(`${getApiBase()}/orders?customer_id=${this.getActiveCustomerId()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const backendOrders: DBOrder[] = json.data;
          saveStoredLocalOrders(backendOrders);
          return backendOrders;
        }
      }
    } catch (e) {
      console.warn("[API] fetchOrders using local persistence:", e);
    }
    return getStoredLocalOrders();
  },

  async updateOrderStatus(orderId: number, status: OrderLifecycleState): Promise<boolean> {
    try {
      await fetch(`${getApiBase()}/orders/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          order_status: status,
        }),
      });
    } catch (e) {
      console.warn("[API] updateOrderStatus backend notice:", e);
    }
    const orders = getStoredLocalOrders().map(o => o.order_id === orderId ? { ...o, order_status: status } : o);
    saveStoredLocalOrders(orders);
    return true;
  },

  async fetchReviews(productId?: number): Promise<DBReview[]> {
    let localReviews = getStoredLocalReviews();
    try {
      const url = productId
        ? `${getApiBase()}/reviews?product_id=${productId}`
        : `${getApiBase()}/reviews`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const backendReviews: DBReview[] = json.data;
          // Merge backend reviews with any locally submitted reviews
          const reviewMap = new Map<string, DBReview>();
          
          // Seed with local reviews first
          for (const rev of localReviews) {
            const key = `${rev.customer_id}_${rev.product_id}_${rev.comment_text.trim()}`;
            reviewMap.set(key, rev);
          }
          // Enrich with authoritative backend records
          for (const rev of backendReviews) {
            const key = `${rev.customer_id}_${rev.product_id}_${(rev.comment_text || "").trim()}`;
            reviewMap.set(key, rev);
          }

          const merged = Array.from(reviewMap.values()).sort(
            (a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
          );

          saveStoredLocalReviews(merged);
          if (productId) {
            return merged.filter(r => r.product_id === productId);
          }
          return merged;
        }
      }
    } catch (e) {
      console.warn("[API] fetchReviews backend notice, using local synchronized storage:", e);
    }

    if (productId) {
      return localReviews.filter(r => r.product_id === productId);
    }
    return localReviews;
  },

  async submitReview(productId: number, rating: number, commentText: string): Promise<DBReview> {
    const tempId = Math.floor(Math.random() * 90000 + 1000);
    const newReview: DBReview = {
      review_id: tempId,
      customer_id: CURRENT_CUSTOMER_ID,
      customer_name: "Varun Agarwal",
      product_id: productId,
      rating,
      comment_text: commentText,
      review_date: new Date().toISOString(),
    };

    // 1. Immediately persist in localStorage so it can NEVER disappear
    const currentList = getStoredLocalReviews();
    const updated = [newReview, ...currentList.filter(r => !(r.customer_id === CURRENT_CUSTOMER_ID && r.product_id === productId && r.comment_text === commentText))];
    saveStoredLocalReviews(updated);

    // 2. Persist to backend database API
    try {
      const res = await fetch(`${getApiBase()}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: CURRENT_CUSTOMER_ID,
          product_id: productId,
          rating,
          comment_text: commentText,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.review_id) {
          newReview.review_id = json.review_id;
          // Update ID in stored list
          const refreshed = getStoredLocalReviews().map(r =>
            r.review_id === tempId ? { ...r, review_id: json.review_id } : r
          );
          saveStoredLocalReviews(refreshed);
        }
      }
    } catch (e) {
      console.warn("[API] submitReview offline fallback stored locally:", e);
    }

    return newReview;
  },

  getActiveCustomerId(): string {
    try {
      return localStorage.getItem("sakura_active_cust") || CURRENT_CUSTOMER_ID;
    } catch {
      return CURRENT_CUSTOMER_ID;
    }
  },

  setActiveCustomerId(id: string): void {
    try {
      localStorage.setItem("sakura_active_cust", id);
      window.dispatchEvent(new CustomEvent("CUSTOMER_CHANGED", { detail: id }));
    } catch {}
  },

  async fetchCustomer(customerId?: string): Promise<DBCustomer> {
    const custId = customerId || this.getActiveCustomerId();
    try {
      const res = await fetch(`${getApiBase()}/customer?customer_id=${custId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          localStorage.setItem(`sakura_cust_profile_${custId}`, JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (e) {
      console.warn("[API] fetchCustomer offline fallback:", e);
    }
    try {
      const local = localStorage.getItem(`sakura_cust_profile_${custId}`);
      if (local) return JSON.parse(local);
    } catch {}
    return {
      customer_id: custId,
      first_name: "Varun",
      last_name: "Agarwal",
      email: "varun.agarwal@example.com",
      phone_no: "555-0199",
      city: "Tokyo",
    };
  },

  async updateCustomer(data: Partial<DBCustomer>): Promise<boolean> {
    const custId = data.customer_id || this.getActiveCustomerId();
    try {
      const res = await fetch(`${getApiBase()}/customer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, customer_id: custId }),
      });
      if (res.ok) {
        const updated = await this.fetchCustomer(custId);
        localStorage.setItem(`sakura_cust_profile_${custId}`, JSON.stringify(updated));
        return true;
      }
    } catch (e) {
      console.warn("[API] updateCustomer offline notice:", e);
    }
    return true;
  },

  async fetchAllCustomers(): Promise<DBCustomer[]> {
    try {
      const res = await fetch(`${getApiBase()}/customers`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn("[API] fetchAllCustomers offline fallback:", e);
    }
    return [
      {
        customer_id: "25BYB0186",
        first_name: "Varun",
        last_name: "Agarwal",
        email: "varun.agarwal@example.com",
        phone_no: "555-0199",
        city: "Tokyo",
      },
    ];
  },

  async createCustomer(data: DBCustomer): Promise<DBCustomer> {
    try {
      const res = await fetch(`${getApiBase()}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        this.setActiveCustomerId(data.customer_id);
      }
    } catch (e) {
      console.warn("[API] createCustomer notice:", e);
    }
    this.setActiveCustomerId(data.customer_id);
    return data;
  },

  async fetchCategories(): Promise<DBCategory[]> {
    try {
      const res = await fetch(`${getApiBase()}/categories`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn("[API] fetchCategories fallback:", e);
    }
    return [
      { category_id: 1, category_name: "Electronics", description: "Premium tech and accessories", product_count: 4 },
      { category_id: 28, category_name: "Keyboards", description: "Mechanical keyboards and accessories", product_count: 1 },
      { category_id: 29, category_name: "Mice & Accessories", description: "Precision pointing devices", product_count: 1 },
      { category_id: 30, category_name: "Lighting", description: "Desk and monitor lights", product_count: 2 },
      { category_id: 31, category_name: "Desk Essentials", description: "Workspace organization and stands", product_count: 4 },
    ];
  },

  async createCategory(category_name: string, description: string): Promise<DBCategory> {
    try {
      const res = await fetch(`${getApiBase()}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name, description }),
      });
      if (res.ok) {
        const json = await res.json();
        return { category_id: json.category_id || 99, category_name, description, product_count: 0 };
      }
    } catch (e) {
      console.warn("[API] createCategory notice:", e);
    }
    return { category_id: 99, category_name, description, product_count: 0 };
  },

  async fetchInventory(): Promise<DBInventoryItem[]> {
    try {
      const res = await fetch(`${getApiBase()}/inventory`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn("[API] fetchInventory notice:", e);
    }
    return [];
  },

  async updateInventoryStock(productId: number, quantity?: number, delta?: number): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBase()}/inventory/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          available_quantity: quantity,
          delta,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn("[API] updateInventoryStock notice:", e);
      return false;
    }
  },
};
