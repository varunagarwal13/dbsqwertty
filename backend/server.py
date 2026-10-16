#!/usr/bin/env python3
"""
Python Oracle Schema-compliant Local Service
Mirrors JavaOracleServer endpoints and implements the exact Oracle schema tables:
Customer, Category, Product, Inventory, Cart, Cart_Item, Order_Tab, Order_Item, Payment, Review.
Can run standalone with zero external dependencies (built-in sqlite3).
"""

import http.server
import json
import os
import re
import sqlite3
import sys
import urllib.parse
from datetime import datetime

PORT = int(os.environ.get("API_PORT", 5000))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "local_schema.db")
DEFAULT_CUSTOMER = "25BYB0186"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS Customer (
        Customer_ID TEXT PRIMARY KEY,
        First_Name TEXT NOT NULL,
        Last_Name TEXT NOT NULL,
        Email TEXT UNIQUE NOT NULL,
        Phone_No TEXT,
        House_No TEXT,
        Street TEXT,
        City TEXT,
        State TEXT,
        Pincode TEXT,
        Registration_Date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Category (
        Category_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Category_name TEXT NOT NULL,
        Description TEXT
    );

    CREATE TABLE IF NOT EXISTS Product (
        Product_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Product_Name TEXT NOT NULL,
        Brand TEXT NOT NULL,
        Price REAL NOT NULL CHECK (Price >= 0),
        Category_ID INTEGER NOT NULL REFERENCES Category(Category_ID),
        Description TEXT
    );

    CREATE TABLE IF NOT EXISTS Inventory (
        Inventory_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Product_ID INTEGER UNIQUE NOT NULL REFERENCES Product(Product_ID),
        Available_Quantity INTEGER NOT NULL CHECK (Available_Quantity >= 0),
        Last_Updated_Date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Cart (
        Cart_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Customer_ID TEXT UNIQUE NOT NULL REFERENCES Customer(Customer_ID),
        Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
        Cart_Status TEXT NOT NULL CHECK (Cart_Status IN ('ACTIVE', 'CHECKED_OUT', 'ABANDONED'))
    );

    CREATE TABLE IF NOT EXISTS Cart_Item (
        Cart_Item_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Cart_ID INTEGER NOT NULL REFERENCES Cart(Cart_ID),
        Product_ID INTEGER NOT NULL REFERENCES Product(Product_ID),
        Quantity INTEGER NOT NULL CHECK (Quantity > 0),
        UNIQUE (Cart_ID, Product_ID)
    );

    CREATE TABLE IF NOT EXISTS Order_Tab (
        Order_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Customer_ID TEXT NOT NULL REFERENCES Customer(Customer_ID),
        Order_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
        Order_Status TEXT NOT NULL CHECK (Order_Status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'))
    );

    CREATE TABLE IF NOT EXISTS Order_Item (
        Order_Item_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Order_ID INTEGER NOT NULL REFERENCES Order_Tab(Order_ID),
        Product_ID INTEGER NOT NULL REFERENCES Product(Product_ID),
        Quantity INTEGER NOT NULL CHECK (Quantity > 0),
        Unit_Price REAL NOT NULL CHECK (Unit_Price >= 0)
    );

    CREATE TABLE IF NOT EXISTS Payment (
        Payment_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Order_ID INTEGER NOT NULL REFERENCES Order_Tab(Order_ID),
        Payment_mode TEXT NOT NULL,
        Payment_Status TEXT NOT NULL CHECK (Payment_Status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
        Payment_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
        Amount REAL NOT NULL CHECK (Amount >= 0)
    );

    CREATE TABLE IF NOT EXISTS Review (
        Review_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Customer_ID TEXT NOT NULL REFERENCES Customer(Customer_ID),
        Product_ID INTEGER NOT NULL REFERENCES Product(Product_ID),
        Rating INTEGER NOT NULL CHECK (Rating BETWEEN 1 AND 5),
        Comment_Text TEXT,
        Review_Date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Customer
    c.execute("INSERT OR IGNORE INTO Customer (Customer_ID, First_Name, Last_Name, Email, Phone_No, House_No, Street, City, State, Pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              (DEFAULT_CUSTOMER, "Varun", "Agarwal", "varun.agarwal@example.com", "555-0199", "42", "Oak Street", "Sanctuary", "CA", "94016"))

    # Seed Cart
    c.execute("INSERT OR IGNORE INTO Cart (Customer_ID, Cart_Status) VALUES (?, 'ACTIVE')", (DEFAULT_CUSTOMER,))

    # Seed Categories
    categories = [
        (1, "Keyboards", "Mechanical keyboards and accessories"),
        (2, "Mice & Accessories", "Precision pointing devices"),
        (3, "Lighting", "Desk and monitor lights"),
        (4, "Desk Essentials", "Workspace organization and stands")
    ]
    for cat in categories:
        c.execute("INSERT OR IGNORE INTO Category (Category_ID, Category_name, Description) VALUES (?, ?, ?)", cat)

    # Seed Products
    products = [
        (1, "Axis Mechanical Keyboard", "MONO", 189.00, 1, "Tactile switches, hot-swappable CNC aluminum chassis"),
        (2, "Arc Wireless Mouse", "MONO", 89.00, 2, "Ergonomic ultra-lightweight magnesium mouse"),
        (3, "Halo Desk Light", "MONO", 129.00, 3, "Architectural ambient desk lamp in bronze and glass"),
        (4, "Orbit USB-C Hub", "MONO", 169.00, 4, "Billet aluminum DAC and multi-port charging hub"),
        (34, "Link USB-C Cable", "MONO", 29.00, 4, "Braided finish 2m 100W charging and data cable")
    ]
    for p in products:
        c.execute("INSERT OR IGNORE INTO Product (Product_ID, Product_Name, Brand, Price, Category_ID, Description) VALUES (?, ?, ?, ?, ?, ?)", p)

    # Seed Inventory
    inventories = [
        (1, 45),
        (2, 28),
        (3, 20),
        (4, 30),
        (34, 150)
    ]
    for inv in inventories:
        c.execute("INSERT OR IGNORE INTO Inventory (Product_ID, Available_Quantity) VALUES (?, ?)", inv)

    # Seed Initial Reviews
    initial_reviews = [
        (DEFAULT_CUSTOMER, 1, 5, "Unbelievable tactile sensation and acoustics. The brass weight makes it sit solid on my desk. Best keyboard I have ever owned."),
        ("25BYB0042", 1, 5, "The build quality of the 6063 aerospace aluminum is top tier. Switches are buttery smooth out of the box."),
        (DEFAULT_CUSTOMER, 2, 5, "The 49g magnesium unibody feels like moving air. The PTFE skates glide effortlessly."),
        ("25BYB0088", 2, 4, "Great ergonomics and crisp silent optical clicks. Battery life has easily lasted me over two weeks."),
        (DEFAULT_CUSTOMER, 3, 5, "The stepped brass dimmer is tactile perfection. The fluted glass creates a warm, relaxing aura across my work area.")
    ]
    c.execute("SELECT COUNT(*) FROM Review")
    if c.fetchone()[0] == 0:
        c.execute("INSERT OR IGNORE INTO Customer (Customer_ID, First_Name, Last_Name, Email) VALUES ('25BYB0042', 'Avery', 'Chen', 'avery.chen@example.com')")
        c.execute("INSERT OR IGNORE INTO Customer (Customer_ID, First_Name, Last_Name, Email) VALUES ('25BYB0088', 'Elena', 'Rostova', 'elena.rostova@example.com')")
        for r in initial_reviews:
            c.execute("INSERT INTO Review (Customer_ID, Product_ID, Rating, Comment_Text) VALUES (?, ?, ?, ?)", r)

    conn.commit()
    conn.close()

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def _json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _get_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return {}

    def _parse_url(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        return parsed.path, {k: v[0] for k, v in params.items()}

    def do_GET(self):
        path, params = self._parse_url()
        cust = params.get("customer_id", DEFAULT_CUSTOMER)

        if path == "/products":
            search = params.get("search", "").strip()
            conn = get_db()
            c = conn.cursor()
            if search:
                query = """
                SELECT p.Product_ID as product_id, p.Product_Name as product_name, p.Brand as brand, p.Price as price, COALESCE(i.Available_Quantity, 0) as available_quantity
                FROM Product p
                LEFT JOIN Inventory i ON p.Product_ID = i.Product_ID
                WHERE LOWER(p.Product_Name) LIKE ? OR LOWER(p.Brand) LIKE ?
                """
                like = f"%{search.lower()}%"
                rows = c.execute(query, (like, like)).fetchall()
            else:
                query = """
                SELECT p.Product_ID as product_id, p.Product_Name as product_name, p.Brand as brand, p.Price as price, COALESCE(i.Available_Quantity, 0) as available_quantity
                FROM Product p
                LEFT JOIN Inventory i ON p.Product_ID = i.Product_ID
                """
                rows = c.execute(query).fetchall()
            data = [dict(r) for r in rows]
            conn.close()
            self._json(200, {"success": True, "data": data})

        elif path == "/cart":
            conn = get_db()
            c = conn.cursor()
            rows = c.execute("""
            SELECT ci.Cart_Item_ID as cart_item_id, ci.Product_ID as product_id, ci.Quantity as quantity, p.Product_Name as product_name, p.Brand as brand, p.Price as price,
                   COALESCE(i.Available_Quantity, 0) as available_quantity
            FROM Cart ca
            JOIN Cart_Item ci ON ca.Cart_ID = ci.Cart_ID
            JOIN Product p ON ci.Product_ID = p.Product_ID
            LEFT JOIN Inventory i ON p.Product_ID = i.Product_ID
            WHERE ca.Customer_ID = ?
            ORDER BY ci.Cart_Item_ID
            """, (cust,)).fetchall()
            data = [dict(r) for r in rows]
            conn.close()
            self._json(200, {"success": True, "data": data})

        elif path.startswith("/orders"):
            conn = get_db()
            c = conn.cursor()
            order_id_match = re.match(r"^/orders/(\d+)$", path)
            if order_id_match:
                ord_id = int(order_id_match.group(1))
                row = c.execute("""
                SELECT o.Order_ID as order_id, o.Order_Date as order_date, o.Order_Status as order_status, COALESCE(p.Amount, 0) as total_amount,
                       p.Payment_ID as payment_id, p.Payment_mode as payment_mode, p.Payment_Status as payment_status, p.Payment_Date as payment_date
                FROM Order_Tab o
                LEFT JOIN Payment p ON o.Order_ID = p.Order_ID
                WHERE o.Order_ID = ? AND o.Customer_ID = ?
                """, (ord_id, cust)).fetchone()
                if not row:
                    conn.close()
                    return self._json(404, {"success": False, "error": "Order not found"})
                ord_data = dict(row)
                items = c.execute("""
                SELECT oi.Order_Item_ID as order_item_id, oi.Product_ID as product_id, p.Product_Name as product_name, oi.Quantity as quantity, oi.Unit_Price as unit_price
                FROM Order_Item oi
                JOIN Product p ON oi.Product_ID = p.Product_ID
                WHERE oi.Order_ID = ?
                """, (ord_id,)).fetchall()
                ord_data["items"] = [dict(i) for i in items]
                conn.close()
                self._json(200, {"success": True, "data": ord_data})
            else:
                rows = c.execute("""
                SELECT o.Order_ID as order_id, o.Order_Date as order_date, o.Order_Status as order_status, COALESCE(p.Amount, 0) as total_amount,
                       p.Payment_ID as payment_id, p.Payment_mode as payment_mode, p.Payment_Status as payment_status, p.Payment_Date as payment_date
                FROM Order_Tab o
                LEFT JOIN Payment p ON o.Order_ID = p.Order_ID
                WHERE o.Customer_ID = ?
                ORDER BY o.Order_Date DESC
                """, (cust,)).fetchall()
                orders = []
                for r in rows:
                    ord_dict = dict(r)
                    items = c.execute("""
                    SELECT oi.Order_Item_ID as order_item_id, oi.Product_ID as product_id, p.Product_Name as product_name, oi.Quantity as quantity, oi.Unit_Price as unit_price
                    FROM Order_Item oi
                    JOIN Product p ON oi.Product_ID = p.Product_ID
                    WHERE oi.Order_ID = ?
                    """, (ord_dict["order_id"],)).fetchall()
                    ord_dict["items"] = [dict(i) for i in items]
                    orders.append(ord_dict)
                conn.close()
                self._json(200, {"success": True, "data": orders})

        elif path == "/reviews":
            prod_id = params.get("product_id")
            conn = get_db()
            c = conn.cursor()
            if prod_id:
                rows = c.execute("""
                SELECT r.Review_ID as review_id, r.Customer_ID as customer_id,
                       COALESCE(c.First_Name || ' ' || c.Last_Name, 'Customer') as customer_name,
                       r.Product_ID as product_id, r.Rating as rating, r.Comment_Text as comment_text, r.Review_Date as review_date
                FROM Review r
                LEFT JOIN Customer c ON r.Customer_ID = c.Customer_ID
                WHERE r.Product_ID = ?
                ORDER BY r.Review_Date DESC
                """, (int(prod_id),)).fetchall()
            else:
                rows = c.execute("""
                SELECT r.Review_ID as review_id, r.Customer_ID as customer_id,
                       COALESCE(c.First_Name || ' ' || c.Last_Name, 'Customer') as customer_name,
                       r.Product_ID as product_id, r.Rating as rating, r.Comment_Text as comment_text, r.Review_Date as review_date
                FROM Review r
                LEFT JOIN Customer c ON r.Customer_ID = c.Customer_ID
                ORDER BY r.Review_Date DESC
                """).fetchall()
            data = [dict(r) for r in rows]
            conn.close()
            self._json(200, {"success": True, "data": data})

        else:
            self._json(404, {"success": False, "error": "Not found"})

    def do_POST(self):
        path, params = self._parse_url()
        body = self._get_body()
        cust = body.get("customer_id") or params.get("customer_id") or DEFAULT_CUSTOMER

        if path == "/cart/add":
            product_id = int(body.get("product_id", -1))
            quantity = int(body.get("quantity", 1))
            if product_id <= 0:
                return self._json(400, {"success": False, "error": "Valid product_id is required"})
            if quantity <= 0:
                return self._json(400, {"success": False, "error": "Quantity must be at least 1"})

            conn = get_db()
            c = conn.cursor()
            stock_row = c.execute("SELECT Available_Quantity FROM Inventory WHERE Product_ID = ?", (product_id,)).fetchone()
            if not stock_row:
                conn.close()
                return self._json(404, {"success": False, "error": "Product out of stock or not found"})
            available = stock_row["Available_Quantity"]

            cart_row = c.execute("SELECT Cart_ID FROM Cart WHERE Customer_ID = ?", (cust,)).fetchone()
            if not cart_row:
                c.execute("INSERT INTO Cart (Customer_ID, Cart_Status) VALUES (?, 'ACTIVE')", (cust,))
                cart_id = c.lastrowid
            else:
                cart_id = cart_row["Cart_ID"]

            item_row = c.execute("SELECT Cart_Item_ID, Quantity FROM Cart_Item WHERE Cart_ID = ? AND Product_ID = ?", (cart_id, product_id)).fetchone()
            if item_row:
                saved_qty = item_row["Quantity"] + quantity
                if saved_qty > available:
                    conn.close()
                    return self._json(400, {"success": False, "error": f"Not enough stock. Only {max(0, available - item_row['Quantity'])} more available."})
                c.execute("UPDATE Cart_Item SET Quantity = ? WHERE Cart_Item_ID = ?", (saved_qty, item_row["Cart_Item_ID"]))
                item_id = item_row["Cart_Item_ID"]
            else:
                if quantity > available:
                    conn.close()
                    return self._json(400, {"success": False, "error": f"Not enough stock. Only {available} available."})
                c.execute("INSERT INTO Cart_Item (Cart_ID, Product_ID, Quantity) VALUES (?, ?, ?)", (cart_id, product_id, quantity))
                item_id = c.lastrowid
                saved_qty = quantity

            conn.commit()
            conn.close()
            self._json(201, {
                "success": True,
                "message": "Item successfully added to cart",
                "cart_item_id": item_id,
                "quantity": saved_qty
            })

        elif path == "/checkout":
            payment_mode = body.get("payment_mode") or "SAKURA DECK Test Wallet"
            conn = get_db()
            c = conn.cursor()
            cart_row = c.execute("SELECT Cart_ID FROM Cart WHERE Customer_ID = ?", (cust,)).fetchone()
            if not cart_row:
                conn.close()
                return self._json(404, {"success": False, "error": "Cart not found"})
            cart_id = cart_row["Cart_ID"]

            items = c.execute("""
            SELECT ci.Product_ID, ci.Quantity, p.Price, COALESCE(i.Available_Quantity, 0) as Available_Quantity
            FROM Cart_Item ci
            JOIN Product p ON ci.Product_ID = p.Product_ID
            LEFT JOIN Inventory i ON ci.Product_ID = i.Product_ID
            WHERE ci.Cart_ID = ?
            """, (cart_id,)).fetchall()

            if not items:
                conn.close()
                return self._json(400, {"success": False, "error": "Cart is empty"})

            total = 0.0
            for item in items:
                if item["Quantity"] > item["Available_Quantity"]:
                    conn.close()
                    return self._json(400, {"success": False, "error": f"Not enough stock for product ID {item['Product_ID']}"})
                total += item["Price"] * item["Quantity"]

            # 1. Insert into Order_Tab with initial status 'PROCESSING'
            c.execute("INSERT INTO Order_Tab (Customer_ID, Order_Status) VALUES (?, 'PROCESSING')", (cust,))
            order_id = c.lastrowid

            # 2. Insert order lines & deduct inventory
            for item in items:
                c.execute("INSERT INTO Order_Item (Order_ID, Product_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?)",
                          (order_id, item["Product_ID"], item["Quantity"], item["Price"]))
                c.execute("UPDATE Inventory SET Available_Quantity = Available_Quantity - ? WHERE Product_ID = ?",
                          (item["Quantity"], item["Product_ID"]))

            # 3. Insert Payment record with settlement mode, gateway status COMPLETED, amount paid
            c.execute("INSERT INTO Payment (Order_ID, Payment_mode, Payment_Status, Amount) VALUES (?, ?, 'COMPLETED', ?)",
                      (order_id, payment_mode, total))
            payment_id = c.lastrowid

            # 4. Clear cart items
            c.execute("DELETE FROM Cart_Item WHERE Cart_ID = ?", (cart_id,))
            conn.commit()
            conn.close()

            self._json(201, {
                "success": True,
                "order_id": order_id,
                "total_amount": round(total, 2),
                "payment_id": payment_id,
                "payment_mode": payment_mode,
                "payment_status": "COMPLETED"
            })

        elif path in ("/orders/status", "/orders/update_status"):
            order_id = int(body.get("order_id", -1))
            status = (body.get("order_status") or "").strip().upper()
            allowed = {"PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"}
            if order_id <= 0 or status not in allowed:
                return self._json(400, {"success": False, "error": "Valid order_id and order_status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED) are required"})

            conn = get_db()
            c = conn.cursor()
            c.execute("UPDATE Order_Tab SET Order_Status = ? WHERE Order_ID = ?", (status, order_id))
            if c.rowcount == 0:
                conn.close()
                return self._json(404, {"success": False, "error": "Order not found"})
            conn.commit()
            conn.close()
            self._json(200, {
                "success": True,
                "message": f"Order status updated to {status}",
                "order_id": order_id,
                "order_status": status
            })

        elif path == "/reviews":
            product_id = int(body.get("product_id", -1))
            rating = int(body.get("rating", -1))
            comment = body.get("comment_text") or body.get("comment") or ""
            if product_id <= 0:
                return self._json(400, {"success": False, "error": "product_id is required"})
            if rating < 1 or rating > 5:
                return self._json(400, {"success": False, "error": "rating must be between 1 and 5"})

            conn = get_db()
            c = conn.cursor()
            c.execute("INSERT INTO Review (Customer_ID, Product_ID, Rating, Comment_Text) VALUES (?, ?, ?, ?)",
                      (cust, product_id, rating, comment))
            review_id = c.lastrowid
            conn.commit()
            conn.close()
            self._json(201, {
                "success": True,
                "message": "Review submitted successfully",
                "review_id": review_id,
                "rating": rating
            })

        else:
            self._json(404, {"success": False, "error": "Not found"})

    def do_PUT(self):
        path, _ = self._parse_url()
        body = self._get_body()

        if path.startswith("/cart/update/"):
            try:
                item_id = int(path.replace("/cart/update/", ""))
            except ValueError:
                return self._json(400, {"success": False, "error": "Invalid cart_item_id"})
            quantity = int(body.get("quantity", -1))
            if quantity < 1:
                return self._json(400, {"success": False, "error": "Quantity must be at least 1"})

            conn = get_db()
            c = conn.cursor()
            row = c.execute("""
            SELECT COALESCE(i.Available_Quantity, 0) as Available_Quantity
            FROM Cart_Item ci
            LEFT JOIN Inventory i ON ci.Product_ID = i.Product_ID
            WHERE ci.Cart_Item_ID = ?
            """, (item_id,)).fetchone()
            if not row:
                conn.close()
                return self._json(404, {"success": False, "error": "Cart item not found"})
            if quantity > row["Available_Quantity"]:
                conn.close()
                return self._json(400, {"success": False, "error": f"Not enough stock. Only {row['Available_Quantity']} available."})

            c.execute("UPDATE Cart_Item SET Quantity = ? WHERE Cart_Item_ID = ?", (quantity, item_id))
            conn.commit()
            conn.close()
            self._json(200, {"success": True, "message": "Cart item updated"})

        elif path in ("/orders/status", "/orders/update_status"):
            self.do_POST()
        else:
            self._json(404, {"success": False, "error": "Not found"})

    def do_DELETE(self):
        path, _ = self._parse_url()
        if path.startswith("/cart/remove/"):
            try:
                item_id = int(path.replace("/cart/remove/", ""))
            except ValueError:
                return self._json(400, {"success": False, "error": "Invalid cart_item_id"})

            conn = get_db()
            c = conn.cursor()
            c.execute("DELETE FROM Cart_Item WHERE Cart_Item_ID = ?", (item_id,))
            if c.rowcount == 0:
                conn.close()
                return self._json(404, {"success": False, "error": "Cart item not found"})
            conn.commit()
            conn.close()
            self._json(200, {"success": True, "message": "Item removed from cart"})
        else:
            self._json(404, {"success": False, "error": "Not found"})

if __name__ == "__main__":
    init_db()
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"Schema-compliant API server listening at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
