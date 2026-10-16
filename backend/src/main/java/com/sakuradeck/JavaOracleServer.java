package com.sakuradeck;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Small dependency-light HTTP API backed by Oracle JDBC. */
public final class JavaOracleServer {
    private static final Properties DOTENV = loadDotEnv();
    private static final String CUSTOMER = "25BYB0186";
    private static final String URL = env("ORACLE_URL", "jdbc:oracle:thin:@localhost:1521/XE");
    private static final String USER = env("ORACLE_USER", "system");
    private static final String PASSWORD = env("ORACLE_PASSWORD", "");
    private static final int PORT = Integer.parseInt(env("API_PORT", "5000"));

    private JavaOracleServer() {}

    public static void main(String[] args) throws Exception {
        Class.forName("oracle.jdbc.OracleDriver");
        try (Connection ignored = connection()) {
            System.out.println("Database Connected Successfully via Oracle JDBC");
        }
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/products", JavaOracleServer::products);
        server.createContext("/categories", JavaOracleServer::categories);
        server.createContext("/customer", JavaOracleServer::customerHandler);
        server.createContext("/customers", JavaOracleServer::customersList);
        server.createContext("/inventory", JavaOracleServer::inventoryHandler);
        server.createContext("/inventory/update", JavaOracleServer::inventoryUpdate);
        server.createContext("/cart", JavaOracleServer::cart);
        server.createContext("/cart/add", JavaOracleServer::cartAdd);
        server.createContext("/cart/update", JavaOracleServer::cartUpdate);
        server.createContext("/cart/remove", JavaOracleServer::cartRemove);
        server.createContext("/checkout", JavaOracleServer::checkout);
        server.createContext("/orders", JavaOracleServer::orders);
        server.createContext("/orders/status", JavaOracleServer::orderStatus);
        server.createContext("/reviews", JavaOracleServer::reviews);
        server.createContext("/", JavaOracleServer::notFound);
        server.setExecutor(null);
        server.start();
        System.out.println("Java Oracle API listening at http://localhost:" + PORT);
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }

    private static void products(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "GET")) return;
        String search = query(ex, "search");
        String sql = "SELECT p.Product_ID, p.Product_Name, p.Brand, p.Price, " +
                "NVL(i.Available_Quantity, 0) Available_Quantity FROM Product p " +
                "LEFT JOIN Inventory i ON p.Product_ID=i.Product_ID " +
                (search.isEmpty() ? "" : "WHERE LOWER(p.Product_Name) LIKE LOWER(?) OR LOWER(p.Brand) LIKE LOWER(?) ");
        try (Connection c = connection(); PreparedStatement s = c.prepareStatement(sql)) {
            if (!search.isEmpty()) { s.setString(1, "%" + search + "%"); s.setString(2, "%" + search + "%"); }
            try (ResultSet r = s.executeQuery()) {
                List<String> rows = new ArrayList<>();
                while (r.next()) rows.add(productJson(r));
                send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
            }
        } catch (SQLException e) { sqlError(ex, e); }
    }

    private static void cart(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "GET")) return;
        try (Connection c = connection(); PreparedStatement s = c.prepareStatement(
                "SELECT ci.Cart_Item_ID, ci.Product_ID, ci.Quantity, p.Product_Name, p.Brand, p.Price, " +
                "NVL(i.Available_Quantity,0) Available_Quantity FROM Cart ca JOIN Cart_Item ci ON ca.Cart_ID=ci.Cart_ID " +
                "JOIN Product p ON ci.Product_ID=p.Product_ID LEFT JOIN Inventory i ON p.Product_ID=i.Product_ID " +
                "WHERE ca.Customer_ID=? ORDER BY ci.Cart_Item_ID")) {
            s.setString(1, customer(ex));
            try (ResultSet r = s.executeQuery()) {
                List<String> rows = new ArrayList<>();
                while (r.next()) rows.add(cartJson(r));
                send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
            }
        } catch (SQLException e) { sqlError(ex, e); }
    }

    private static void cartAdd(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "POST")) return;
        Map<String, String> body = body(ex); int product = integer(body.get("product_id"), -1); int qty = integer(body.get("quantity"), 1);
        if (product < 0) { error(ex, 400, "Product ID is required"); return; }
        if (qty < 1) { error(ex, 400, "Quantity must be at least 1"); return; }
        String cust = body.get("customer_id") != null && !body.get("customer_id").trim().isEmpty() ? body.get("customer_id").trim() : customer(ex);
        try (Connection c = connection()) {
            c.setAutoCommit(false);
            try (PreparedStatement stock = c.prepareStatement("SELECT NVL(Available_Quantity,0) FROM Inventory WHERE Product_ID=?");
                 PreparedStatement cart = c.prepareStatement("SELECT Cart_ID FROM Cart WHERE Customer_ID=?");
                 PreparedStatement item = c.prepareStatement("SELECT Cart_Item_ID, Quantity FROM Cart_Item WHERE Cart_ID=? AND Product_ID=? FOR UPDATE")) {
                stock.setInt(1, product); ResultSet sr = stock.executeQuery();
                if (!sr.next()) { c.rollback(); error(ex, 404, "Product not found or out of stock"); return; }
                int available = sr.getInt(1); cart.setString(1, cust); ResultSet cr = cart.executeQuery();
                if (!cr.next()) { c.rollback(); error(ex, 404, "Cart not found for this customer"); return; }
                int cartId = cr.getInt(1); item.setInt(1, cartId); item.setInt(2, product); ResultSet ir = item.executeQuery();
                int itemId; int savedQty;
                if (ir.next()) {
                    itemId = ir.getInt(1); savedQty = ir.getInt(2) + qty;
                    if (savedQty > available) { c.rollback(); error(ex, 400, "Not enough stock. Only " + Math.max(0, available - ir.getInt(2)) + " more available."); return; }
                    try (PreparedStatement u = c.prepareStatement("UPDATE Cart_Item SET Quantity=? WHERE Cart_Item_ID=?")) { u.setInt(1, savedQty); u.setInt(2, itemId); u.executeUpdate(); }
                } else {
                    if (qty > available) { c.rollback(); error(ex, 400, "Not enough stock. Only " + available + " available."); return; }
                    try (PreparedStatement i = c.prepareStatement("INSERT INTO Cart_Item (Cart_ID, Product_ID, Quantity) VALUES (?, ?, ?)", new String[] { "CART_ITEM_ID" })) { 
                        i.setInt(1, cartId); 
                        i.setInt(2, product); 
                        i.setInt(3, qty); 
                        i.executeUpdate(); 
                        try (ResultSet keys = i.getGeneratedKeys()) { 
                            if (!keys.next()) throw new SQLException("Cart item id was not returned"); 
                            itemId = keys.getInt(1); 
                            savedQty = qty; 
                        }
                    }
                }
                c.commit(); send(ex, 201, "{\"success\":true,\"message\":\"Item successfully added to cart\",\"cart_item_id\":" + itemId + ",\"quantity\":" + savedQty + "}");
            } catch (Exception e) { c.rollback(); throw e; }
        } catch (Exception e) { sqlError(ex, e); }
    }

    private static void cartUpdate(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "PUT")) return; int id = pathId(ex.getRequestURI().getPath(), "/cart/update/"); Map<String,String> body = body(ex); int qty = integer(body.get("quantity"), -1);
        if (id < 0 || qty < 1) { error(ex, 400, "Valid integer quantity is required"); return; }
        try (Connection c = connection()) {
            c.setAutoCommit(false);
            try (PreparedStatement s = c.prepareStatement("SELECT NVL(i.Available_Quantity,0) FROM Cart_Item ci LEFT JOIN Inventory i ON ci.Product_ID=i.Product_ID WHERE ci.Cart_Item_ID=? FOR UPDATE")) {
                s.setInt(1, id); ResultSet r = s.executeQuery(); if (!r.next()) { c.rollback(); error(ex,404,"Cart item not found"); return; } if (qty > r.getInt(1)) { c.rollback(); error(ex,400,"Not enough stock. Only " + r.getInt(1) + " available."); return; }
                try (PreparedStatement u = c.prepareStatement("UPDATE Cart_Item SET Quantity=? WHERE Cart_Item_ID=?")) { 
                    u.setInt(1,qty); u.setInt(2,id); u.executeUpdate(); c.commit(); send(ex,200,"{\"success\":true,\"message\":\"Cart item updated\"}"); 
                }
            } catch (Exception e) { c.rollback(); throw e; }
        } catch (SQLException e) { sqlError(ex,e); }
    }

    private static void cartRemove(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "DELETE")) return; int id = pathId(ex.getRequestURI().getPath(), "/cart/remove/");
        try (Connection c = connection()) {
            c.setAutoCommit(false);
            try (PreparedStatement s = c.prepareStatement("DELETE FROM Cart_Item WHERE Cart_Item_ID=?")) { 
                s.setInt(1,id); if (s.executeUpdate()==0) { c.rollback(); error(ex,404,"Cart item not found"); return; } c.commit(); send(ex,200,"{\"success\":true,\"message\":\"Item removed from cart\"}"); 
            } catch (Exception e) { c.rollback(); throw e; }
        } catch (SQLException e) { sqlError(ex,e); }
    }

    private static void checkout(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "POST")) return;
        Map<String, String> body = body(ex);
        String paymentMode = body.get("payment_mode");
        if (paymentMode == null || paymentMode.trim().isEmpty()) {
            paymentMode = "SAKURA DECK Test Wallet";
        }
        try (Connection c = connection()) {
            c.setAutoCommit(false);
            try (PreparedStatement cart = c.prepareStatement("SELECT Cart_ID FROM Cart WHERE Customer_ID=?"); 
                 PreparedStatement items = c.prepareStatement("SELECT ci.Product_ID, ci.Quantity, p.Price, NVL(i.Available_Quantity,0) FROM Cart_Item ci JOIN Product p ON ci.Product_ID=p.Product_ID LEFT JOIN Inventory i ON ci.Product_ID=i.Product_ID WHERE ci.Cart_ID=? FOR UPDATE")) {
                cart.setString(1, customer(ex)); 
                ResultSet cr = cart.executeQuery(); 
                if (!cr.next()) { error(ex, 404, "Cart not found"); return; } 
                int cartId = cr.getInt(1); 
                items.setInt(1, cartId); 
                ResultSet r = items.executeQuery(); 
                List<int[]> ids = new ArrayList<>(); 
                List<Double> prices = new ArrayList<>(); 
                double total = 0; 
                while (r.next()) {
                    int p = r.getInt(1), q = r.getInt(2), stock = r.getInt(4);
                    if (q > stock) { c.rollback(); error(ex, 400, "Not enough stock for product ID " + p); return; }
                    ids.add(new int[]{p, q});
                    prices.add(r.getDouble(3));
                    total += r.getDouble(3) * q;
                } 
                if (ids.isEmpty()) { error(ex, 400, "Cart is empty"); return; }
                
                // 1. Insert into Order_Tab with lifecycle state 'PROCESSING'
                int orderId; 
                try (PreparedStatement o = c.prepareStatement("INSERT INTO Order_Tab (Customer_ID, Order_Status) VALUES (?, 'PROCESSING')", new String[] { "ORDER_ID" })) {
                    o.setString(1, customer(ex));
                    o.executeUpdate();
                    ResultSet k = o.getGeneratedKeys();
                    if (!k.next()) throw new SQLException("Order id was not returned");
                    orderId = k.getInt(1);
                }

                // 2. Insert order lines into Order_Item and deduct inventory
                for (int i = 0; i < ids.size(); i++) {
                    try (PreparedStatement oi = c.prepareStatement("INSERT INTO Order_Item (Order_ID, Product_ID, Quantity, Unit_Price) VALUES (?,?,?,?)");
                         PreparedStatement inv = c.prepareStatement("UPDATE Inventory SET Available_Quantity=Available_Quantity-? WHERE Product_ID=?")) {
                        oi.setInt(1, orderId);
                        oi.setInt(2, ids.get(i)[0]);
                        oi.setInt(3, ids.get(i)[1]);
                        oi.setDouble(4, prices.get(i));
                        oi.executeUpdate();
                        inv.setInt(1, ids.get(i)[1]);
                        inv.setInt(2, ids.get(i)[0]);
                        inv.executeUpdate();
                    }
                }

                // 3. Insert Payment record with settlement mode, gateway status COMPLETED, amount paid
                int paymentId = 0;
                try (PreparedStatement p = c.prepareStatement("INSERT INTO Payment (Order_ID, Payment_mode, Payment_Status, Amount) VALUES (?, ?, 'COMPLETED', ?)", new String[] { "PAYMENT_ID" })) {
                    p.setInt(1, orderId);
                    p.setString(2, paymentMode);
                    p.setDouble(3, total);
                    p.executeUpdate();
                    try (ResultSet pk = p.getGeneratedKeys()) {
                        if (pk.next()) paymentId = pk.getInt(1);
                    }
                } 

                // 4. Clear cart items
                try (PreparedStatement d = c.prepareStatement("DELETE FROM Cart_Item WHERE Cart_ID=?")) {
                    d.setInt(1, cartId);
                    d.executeUpdate();
                } 

                c.commit(); 
                send(ex, 201, "{\"success\":true,\"order_id\":" + orderId + ",\"total_amount\":" + total + 
                     ",\"payment_id\":" + paymentId + ",\"payment_mode\":" + quote(paymentMode) + ",\"payment_status\":\"COMPLETED\"}");
            } catch (Exception e) { c.rollback(); throw e; }
        } catch (Exception e) { sqlError(ex, e); }
    }

    private static void orders(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "GET")) return; 
        String path = ex.getRequestURI().getPath(); 
        int id = pathId(path, "/orders/");
        try (Connection c = connection()) {
            if (id < 0) {
                // List all orders with payment details
                String sql = "SELECT o.Order_ID, o.Order_Date, o.Order_Status, NVL(p.Amount,0) Total_Amount, " +
                        "p.Payment_ID, p.Payment_mode, p.Payment_Status, p.Payment_Date " +
                        "FROM Order_Tab o LEFT JOIN Payment p ON o.Order_ID=p.Order_ID " +
                        "WHERE o.Customer_ID=? ORDER BY o.Order_Date DESC";
                try (PreparedStatement s = c.prepareStatement(sql)) {
                    s.setString(1, customer(ex));
                    ResultSet r = s.executeQuery();
                    List<String> rows = new ArrayList<>();
                    while (r.next()) {
                        int ordId = r.getInt(1);
                        // Fetch order lines for each order
                        List<String> items = new ArrayList<>();
                        try (PreparedStatement is = c.prepareStatement("SELECT oi.Order_Item_ID, oi.Product_ID, p.Product_Name, oi.Quantity, oi.Unit_Price FROM Order_Item oi JOIN Product p ON oi.Product_ID=p.Product_ID WHERE oi.Order_ID=?")) {
                            is.setInt(1, ordId);
                            ResultSet ir = is.executeQuery();
                            while (ir.next()) {
                                items.add("{\"order_item_id\":" + ir.getInt(1) + ",\"product_id\":" + ir.getInt(2) + ",\"product_name\":" + quote(ir.getString(3)) + ",\"quantity\":" + ir.getInt(4) + ",\"unit_price\":" + ir.getDouble(5) + "}");
                            }
                        }
                        rows.add("{\"order_id\":" + ordId + 
                                 ",\"order_date\":" + quote(r.getTimestamp(2)) + 
                                 ",\"order_status\":" + quote(r.getString(3)) + 
                                 ",\"total_amount\":" + r.getDouble(4) + 
                                 ",\"payment_id\":" + r.getInt(5) + 
                                 ",\"payment_mode\":" + quote(r.getString(6)) + 
                                 ",\"payment_status\":" + quote(r.getString(7)) + 
                                 ",\"payment_date\":" + quote(r.getTimestamp(8)) + 
                                 ",\"items\":[" + join(items) + "]}");
                    }
                    send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
                }
            } else {
                // Single order details
                try (PreparedStatement s = c.prepareStatement("SELECT o.Order_ID, o.Order_Date, o.Order_Status, NVL(p.Amount,0), p.Payment_ID, p.Payment_mode, p.Payment_Status, p.Payment_Date FROM Order_Tab o LEFT JOIN Payment p ON o.Order_ID=p.Order_ID WHERE o.Order_ID=? AND o.Customer_ID=?")) {
                    s.setInt(1, id);
                    s.setString(2, customer(ex));
                    ResultSet r = s.executeQuery();
                    if (!r.next()) { error(ex, 404, "Order not found"); return; }
                    List<String> items = new ArrayList<>();
                    try (PreparedStatement i = c.prepareStatement("SELECT oi.Order_Item_ID, oi.Product_ID, p.Product_Name, oi.Quantity, oi.Unit_Price FROM Order_Item oi JOIN Product p ON oi.Product_ID=p.Product_ID WHERE oi.Order_ID=?")) {
                        i.setInt(1, id);
                        ResultSet ir = i.executeQuery();
                        while (ir.next()) {
                            items.add("{\"order_item_id\":" + ir.getInt(1) + ",\"product_id\":" + ir.getInt(2) + ",\"product_name\":" + quote(ir.getString(3)) + ",\"quantity\":" + ir.getInt(4) + ",\"unit_price\":" + ir.getDouble(5) + "}");
                        }
                    }
                    send(ex, 200, "{\"success\":true,\"data\":{\"order_id\":" + r.getInt(1) + 
                         ",\"order_date\":" + quote(r.getTimestamp(2)) + 
                         ",\"order_status\":" + quote(r.getString(3)) + 
                         ",\"total_amount\":" + r.getDouble(4) + 
                         ",\"payment_id\":" + r.getInt(5) + 
                         ",\"payment_mode\":" + quote(r.getString(6)) + 
                         ",\"payment_status\":" + quote(r.getString(7)) + 
                         ",\"payment_date\":" + quote(r.getTimestamp(8)) + 
                         ",\"items\":[" + join(items) + "]}}");
                }
            }
        } catch (SQLException e) { sqlError(ex, e); }
    }

    private static void orderStatus(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "POST") && !method(ex, "PUT")) return;
        Map<String, String> body = body(ex);
        int orderId = integer(body.get("order_id"), -1);
        String status = body.get("order_status");
        if (orderId < 0 || status == null || status.trim().isEmpty()) {
            error(ex, 400, "order_id and valid order_status are required");
            return;
        }
        status = status.trim().toUpperCase();
        Set<String> validStatuses = new HashSet<>(Arrays.asList("PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"));
        if (!validStatuses.contains(status)) {
            error(ex, 400, "Invalid order status. Allowed: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED");
            return;
        }
        try (Connection c = connection(); PreparedStatement s = c.prepareStatement("UPDATE Order_Tab SET Order_Status=? WHERE Order_ID=?")) {
            s.setString(1, status);
            s.setInt(2, orderId);
            int updated = s.executeUpdate();
            if (updated == 0) {
                error(ex, 404, "Order not found");
                return;
            }
            send(ex, 200, "{\"success\":true,\"message\":\"Order status updated to " + status + "\",\"order_id\":" + orderId + ",\"order_status\":" + quote(status) + "}");
        } catch (SQLException e) { sqlError(ex, e); }
    }

    private static void reviews(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (ex.getRequestMethod().equalsIgnoreCase("GET")) {
            String prodParam = query(ex, "product_id");
            int prodId = integer(prodParam, -1);
            String sql = "SELECT r.Review_ID, r.Customer_ID, NVL(c.First_Name, 'Customer') First_Name, NVL(c.Last_Name, '') Last_Name, " +
                    "r.Product_ID, r.Rating, r.Comment_Text, r.Review_Date " +
                    "FROM Review r LEFT JOIN Customer c ON r.Customer_ID=c.Customer_ID " +
                    (prodId > 0 ? "WHERE r.Product_ID=? " : "") +
                    "ORDER BY r.Review_Date DESC";
            try (Connection c = connection(); PreparedStatement s = c.prepareStatement(sql)) {
                if (prodId > 0) s.setInt(1, prodId);
                ResultSet r = s.executeQuery();
                List<String> rows = new ArrayList<>();
                while (r.next()) {
                    rows.add("{\"review_id\":" + r.getInt(1) + 
                             ",\"customer_id\":" + quote(r.getString(2)) + 
                             ",\"customer_name\":" + quote((r.getString(3) + " " + r.getString(4)).trim()) + 
                             ",\"product_id\":" + r.getInt(5) + 
                             ",\"rating\":" + r.getInt(6) + 
                             ",\"comment_text\":" + quote(r.getString(7)) + 
                             ",\"review_date\":" + quote(r.getTimestamp(8)) + "}");
                }
                send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
            } catch (SQLException e) { sqlError(ex, e); }
        } else if (ex.getRequestMethod().equalsIgnoreCase("POST")) {
            Map<String, String> body = body(ex);
            String cust = body.get("customer_id") != null && !body.get("customer_id").trim().isEmpty() ? body.get("customer_id").trim() : customer(ex);
            int prodId = integer(body.get("product_id"), -1);
            int rating = integer(body.get("rating"), -1);
            String comment = body.get("comment_text");
            if (comment == null) comment = body.get("comment");
            if (prodId < 0) { error(ex, 400, "product_id is required"); return; }
            if (rating < 1 || rating > 5) { error(ex, 400, "rating must be between 1 and 5"); return; }

            try (Connection c = connection(); 
                 PreparedStatement s = c.prepareStatement("INSERT INTO Review (Customer_ID, Product_ID, Rating, Comment_Text) VALUES (?, ?, ?, ?)", new String[] { "REVIEW_ID" })) {
                s.setString(1, cust);
                s.setInt(2, prodId);
                s.setInt(3, rating);
                s.setString(4, comment != null ? comment : "");
                s.executeUpdate();
                int reviewId = 0;
                try (ResultSet k = s.getGeneratedKeys()) {
                    if (k.next()) reviewId = k.getInt(1);
                }
                send(ex, 201, "{\"success\":true,\"message\":\"Review submitted successfully\",\"review_id\":" + reviewId + ",\"rating\":" + rating + "}");
            } catch (SQLException e) { sqlError(ex, e); }
        } else {
            send(ex, 405, "{\"success\":false,\"error\":\"Method not allowed\"}");
        }
    }

    private static void categories(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (ex.getRequestMethod().equalsIgnoreCase("GET")) {
            String sql = "SELECT c.Category_ID, c.Category_name, NVL(c.Description, '') Description, COUNT(p.Product_ID) Product_Count " +
                         "FROM Category c LEFT JOIN Product p ON c.Category_ID=p.Category_ID " +
                         "GROUP BY c.Category_ID, c.Category_name, c.Description ORDER BY c.Category_ID";
            try (Connection conn = connection(); PreparedStatement s = conn.prepareStatement(sql); ResultSet r = s.executeQuery()) {
                List<String> rows = new ArrayList<>();
                while (r.next()) {
                    rows.add("{\"category_id\":" + r.getInt(1) + 
                             ",\"category_name\":" + quote(r.getString(2)) + 
                             ",\"description\":" + quote(r.getString(3)) + 
                             ",\"product_count\":" + r.getInt(4) + "}");
                }
                send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
            } catch (SQLException e) { sqlError(ex, e); }
        } else if (ex.getRequestMethod().equalsIgnoreCase("POST")) {
            Map<String, String> b = body(ex);
            String name = b.get("category_name");
            String desc = b.get("description");
            if (name == null || name.trim().isEmpty()) { error(ex, 400, "Category name is required"); return; }
            try (Connection conn = connection(); PreparedStatement s = conn.prepareStatement("INSERT INTO Category (Category_name, Description) VALUES (?, ?)", new String[] { "CATEGORY_ID" })) {
                s.setString(1, name.trim());
                s.setString(2, desc != null ? desc.trim() : "");
                s.executeUpdate();
                int id = 0;
                try (ResultSet k = s.getGeneratedKeys()) { if (k.next()) id = k.getInt(1); }
                send(ex, 201, "{\"success\":true,\"message\":\"Category created successfully\",\"category_id\":" + id + ",\"category_name\":" + quote(name.trim()) + "}");
            } catch (SQLException e) { sqlError(ex, e); }
        } else {
            send(ex, 405, "{\"success\":false,\"error\":\"Method not allowed\"}");
        }
    }

    private static void customerHandler(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (ex.getRequestMethod().equalsIgnoreCase("GET")) {
            String custId = customer(ex);
            try (Connection conn = connection(); PreparedStatement s = conn.prepareStatement(
                    "SELECT Customer_ID, First_Name, Last_Name, Email, NVL(Phone_No,'') Phone_No, " +
                    "NVL(House_No,'') House_No, NVL(Street,'') Street, NVL(City,'') City, NVL(State,'') State, NVL(Pincode,'') Pincode, Registration_Date " +
                    "FROM Customer WHERE Customer_ID=?")) {
                s.setString(1, custId);
                try (ResultSet r = s.executeQuery()) {
                    if (!r.next()) { error(ex, 404, "Customer not found"); return; }
                    String json = "{\"customer_id\":" + quote(r.getString(1)) + 
                                  ",\"first_name\":" + quote(r.getString(2)) + 
                                  ",\"last_name\":" + quote(r.getString(3)) + 
                                  ",\"email\":" + quote(r.getString(4)) + 
                                  ",\"phone_no\":" + quote(r.getString(5)) + 
                                  ",\"house_no\":" + quote(r.getString(6)) + 
                                  ",\"street\":" + quote(r.getString(7)) + 
                                  ",\"city\":" + quote(r.getString(8)) + 
                                  ",\"state\":" + quote(r.getString(9)) + 
                                  ",\"pincode\":" + quote(r.getString(10)) + 
                                  ",\"registration_date\":" + quote(r.getTimestamp(11)) + "}";
                    send(ex, 200, "{\"success\":true,\"data\":" + json + "}");
                }
            } catch (SQLException e) { sqlError(ex, e); }
        } else if (ex.getRequestMethod().equalsIgnoreCase("PUT")) {
            Map<String, String> b = body(ex);
            String custId = b.get("customer_id") != null && !b.get("customer_id").trim().isEmpty() ? b.get("customer_id").trim() : customer(ex);
            String first = b.get("first_name");
            String last = b.get("last_name");
            String phone = b.get("phone_no");
            String house = b.get("house_no");
            String street = b.get("street");
            String city = b.get("city");
            String state = b.get("state");
            String pin = b.get("pincode");
            try (Connection conn = connection(); PreparedStatement s = conn.prepareStatement(
                    "UPDATE Customer SET First_Name=NVL(?, First_Name), Last_Name=NVL(?, Last_Name), " +
                    "Phone_No=?, House_No=?, Street=?, City=?, State=?, Pincode=? WHERE Customer_ID=?")) {
                s.setString(1, first);
                s.setString(2, last);
                s.setString(3, phone != null ? phone : "");
                s.setString(4, house != null ? house : "");
                s.setString(5, street != null ? street : "");
                s.setString(6, city != null ? city : "");
                s.setString(7, state != null ? state : "");
                s.setString(8, pin != null ? pin : "");
                s.setString(9, custId);
                int updated = s.executeUpdate();
                if (updated == 0) { error(ex, 404, "Customer not found"); return; }
                send(ex, 200, "{\"success\":true,\"message\":\"Customer profile updated successfully\",\"customer_id\":" + quote(custId) + "}");
            } catch (SQLException e) { sqlError(ex, e); }
        } else {
            send(ex, 405, "{\"success\":false,\"error\":\"Method not allowed\"}");
        }
    }

    private static void customersList(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (ex.getRequestMethod().equalsIgnoreCase("GET")) {
            try (Connection conn = connection(); PreparedStatement s = conn.prepareStatement(
                    "SELECT Customer_ID, First_Name, Last_Name, Email, NVL(Phone_No,'') Phone_No, NVL(City,'') City, Registration_Date FROM Customer ORDER BY Registration_Date DESC");
                 ResultSet r = s.executeQuery()) {
                List<String> rows = new ArrayList<>();
                while (r.next()) {
                    rows.add("{\"customer_id\":" + quote(r.getString(1)) + 
                             ",\"first_name\":" + quote(r.getString(2)) + 
                             ",\"last_name\":" + quote(r.getString(3)) + 
                             ",\"email\":" + quote(r.getString(4)) + 
                             ",\"phone_no\":" + quote(r.getString(5)) + 
                             ",\"city\":" + quote(r.getString(6)) + 
                             ",\"registration_date\":" + quote(r.getTimestamp(7)) + "}");
                }
                send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
            } catch (SQLException e) { sqlError(ex, e); }
        } else if (ex.getRequestMethod().equalsIgnoreCase("POST")) {
            Map<String, String> b = body(ex);
            String id = b.get("customer_id");
            String first = b.get("first_name");
            String last = b.get("last_name");
            String email = b.get("email");
            String phone = b.get("phone_no");
            String house = b.get("house_no");
            String street = b.get("street");
            String city = b.get("city");
            String state = b.get("state");
            String pin = b.get("pincode");
            if (id == null || id.trim().isEmpty() || email == null || email.trim().isEmpty()) {
                error(ex, 400, "Customer ID and Email are required");
                return;
            }
            try (Connection conn = connection()) {
                conn.setAutoCommit(false);
                try (PreparedStatement s = conn.prepareStatement("INSERT INTO Customer (Customer_ID, First_Name, Last_Name, Email, Phone_No, House_No, Street, City, State, Pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                     PreparedStatement cart = conn.prepareStatement("INSERT INTO Cart (Customer_ID, Cart_Status) VALUES (?, 'ACTIVE')")) {
                    s.setString(1, id.trim());
                    s.setString(2, first != null ? first.trim() : "Guest");
                    s.setString(3, last != null ? last.trim() : "User");
                    s.setString(4, email.trim());
                    s.setString(5, phone != null ? phone.trim() : "");
                    s.setString(6, house != null ? house.trim() : "");
                    s.setString(7, street != null ? street.trim() : "");
                    s.setString(8, city != null ? city.trim() : "");
                    s.setString(9, state != null ? state.trim() : "");
                    s.setString(10, pin != null ? pin.trim() : "");
                    s.executeUpdate();
                    cart.setString(1, id.trim());
                    cart.executeUpdate();
                    conn.commit();
                    send(ex, 201, "{\"success\":true,\"message\":\"Customer registered with active cart\",\"customer_id\":" + quote(id.trim()) + "}");
                } catch (Exception e) { conn.rollback(); throw e; }
            } catch (SQLException e) { sqlError(ex, e); }
        } else {
            send(ex, 405, "{\"success\":false,\"error\":\"Method not allowed\"}");
        }
    }

    private static void inventoryHandler(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "GET")) return;
        String sql = "SELECT i.Inventory_ID, i.Product_ID, p.Product_Name, p.Brand, NVL(c.Category_name, 'General') Category_Name, " +
                     "p.Price, i.Available_Quantity, i.Last_Updated_Date " +
                     "FROM Inventory i JOIN Product p ON i.Product_ID=p.Product_ID " +
                     "LEFT JOIN Category c ON p.Category_ID=c.Category_ID ORDER BY i.Product_ID";
        try (Connection conn = connection(); PreparedStatement s = conn.prepareStatement(sql); ResultSet r = s.executeQuery()) {
            List<String> rows = new ArrayList<>();
            while (r.next()) {
                rows.add("{\"inventory_id\":" + r.getInt(1) + 
                         ",\"product_id\":" + r.getInt(2) + 
                         ",\"product_name\":" + quote(r.getString(3)) + 
                         ",\"brand\":" + quote(r.getString(4)) + 
                         ",\"category_name\":" + quote(r.getString(5)) + 
                         ",\"price\":" + r.getDouble(6) + 
                         ",\"available_quantity\":" + r.getInt(7) + 
                         ",\"last_updated_date\":" + quote(r.getTimestamp(8)) + "}");
            }
            send(ex, 200, "{\"success\":true,\"data\":[" + join(rows) + "]}");
        } catch (SQLException e) { sqlError(ex, e); }
    }

    private static void inventoryUpdate(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex, "POST") && !method(ex, "PUT")) return;
        Map<String, String> b = body(ex);
        int prodId = integer(b.get("product_id"), -1);
        int qty = integer(b.get("available_quantity"), -1);
        int delta = integer(b.get("delta"), 0);
        if (prodId < 0) { error(ex, 400, "product_id is required"); return; }
        
        try (Connection conn = connection()) {
            if (qty >= 0) {
                try (PreparedStatement s = conn.prepareStatement("UPDATE Inventory SET Available_Quantity=?, Last_Updated_Date=CURRENT_TIMESTAMP WHERE Product_ID=?")) {
                    s.setInt(1, qty);
                    s.setInt(2, prodId);
                    int u = s.executeUpdate();
                    if (u == 0) { error(ex, 404, "Inventory record not found"); return; }
                }
            } else if (delta != 0) {
                try (PreparedStatement s = conn.prepareStatement("UPDATE Inventory SET Available_Quantity=GREATEST(0, Available_Quantity + ?), Last_Updated_Date=CURRENT_TIMESTAMP WHERE Product_ID=?")) {
                    s.setInt(1, delta);
                    s.setInt(2, prodId);
                    int u = s.executeUpdate();
                    if (u == 0) { error(ex, 404, "Inventory record not found"); return; }
                }
            } else {
                error(ex, 400, "available_quantity or delta is required");
                return;
            }
            try (PreparedStatement s = conn.prepareStatement("SELECT Available_Quantity, Last_Updated_Date FROM Inventory WHERE Product_ID=?")) {
                s.setInt(1, prodId);
                ResultSet r = s.executeQuery();
                if (r.next()) {
                    send(ex, 200, "{\"success\":true,\"message\":\"Inventory updated\",\"product_id\":" + prodId + ",\"available_quantity\":" + r.getInt(1) + ",\"last_updated_date\":" + quote(r.getTimestamp(2)) + "}");
                    return;
                }
            }
            send(ex, 200, "{\"success\":true,\"message\":\"Inventory updated\"}");
        } catch (SQLException e) { sqlError(ex, e); }
    }

    private static String productJson(ResultSet r) throws SQLException {
        return "{\"product_id\":" + r.getInt(1) + ",\"product_name\":" + quote(r.getString(2)) + ",\"brand\":" + quote(r.getString(3)) + ",\"price\":" + r.getDouble(4) + ",\"available_quantity\":" + r.getInt(5) + "}";
    }
    
    private static String cartJson(ResultSet r) throws SQLException {
        return "{\"cart_item_id\":" + r.getInt(1) + ",\"product_id\":" + r.getInt(2) + ",\"quantity\":" + r.getInt(3) + ",\"product_name\":" + quote(r.getString(4)) + ",\"brand\":" + quote(r.getString(5)) + ",\"price\":" + r.getDouble(6) + ",\"available_quantity\":" + r.getInt(7) + "}";
    }

    private static String quote(Object value) {
        if (value == null) return "null";
        String s = value instanceof Timestamp ? new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX").format((Timestamp) value) : String.valueOf(value);
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + "\"";
    }

    private static String join(List<String> v) {
        return String.join(",", v);
    }

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        if (v == null || v.trim().isEmpty()) v = DOTENV.getProperty(key);
        return v == null || v.trim().isEmpty() ? fallback : v.trim();
    }

    private static Properties loadDotEnv() {
        Properties p = new Properties();
        java.io.File f = new java.io.File(".env");
        if (!f.isFile()) return p;
        try (java.io.BufferedReader r = new java.io.BufferedReader(new java.io.FileReader(f))) {
            String line;
            while ((line = r.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int i = line.indexOf('=');
                if (i > 0) p.setProperty(line.substring(0, i).trim(), line.substring(i + 1).trim());
            }
        } catch (IOException ignored) {}
        return p;
    }

    private static String customer(HttpExchange e) {
        String c = query(e, "customer_id");
        return c.isEmpty() ? CUSTOMER : c;
    }

    private static String query(HttpExchange e, String key) {
        String q = e.getRequestURI().getRawQuery();
        if (q == null) return "";
        for (String p : q.split("&")) {
            String[] kv = p.split("=", 2);
            if (kv.length == 2 && kv[0].equals(key)) {
                try { return URLDecoder.decode(kv[1], "UTF-8"); } catch (Exception ignored) {}
            }
        }
        return "";
    }

    private static int pathId(String path, String prefix) {
        if (!path.startsWith(prefix)) return -1;
        try { return Integer.parseInt(path.substring(prefix.length())); } catch (Exception e) { return -1; }
    }

    private static Map<String, String> body(HttpExchange e) throws IOException {
        String s = read(e.getRequestBody());
        Map<String, String> m = new HashMap<>();
        Matcher x = Pattern.compile("\"([a-zA-Z0-9_]+)\"\\s*:\\s*(?:\"([^\"]*)\"|(-?\\d+(?:\\.\\d+)?))").matcher(s);
        while (x.find()) {
            m.put(x.group(1), x.group(2) != null ? x.group(2) : x.group(3));
        }
        return m;
    }

    private static String read(InputStream in) throws IOException {
        byte[] b = new byte[8192];
        StringBuilder s = new StringBuilder();
        int n;
        while ((n = in.read(b)) > 0) s.append(new String(b, 0, n, StandardCharsets.UTF_8));
        return s.toString();
    }

    private static int integer(String v, int fallback) {
        try { return Integer.parseInt(v); } catch (Exception e) { return fallback; }
    }

    private static boolean options(HttpExchange e) throws IOException {
        if (e.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
            send(e, 204, "");
            return true;
        }
        return false;
    }

    private static boolean method(HttpExchange e, String expected) throws IOException {
        if (!e.getRequestMethod().equalsIgnoreCase(expected)) {
            send(e, 405, "{\"success\":false,\"error\":\"Method not allowed\"}");
            return false;
        }
        return true;
    }

    private static void notFound(HttpExchange e) throws IOException {
        error(e, 404, "Not found");
    }

    private static void error(HttpExchange e, int status, String message) throws IOException {
        send(e, status, "{\"success\":false,\"error\":" + quote(message) + "}");
    }

    private static void sqlError(HttpExchange e, Exception error) throws IOException {
        error.printStackTrace();
        error(e, 503, "Database service unavailable");
    }

    private static void send(HttpExchange e, int status, String body) throws IOException {
        Headers h = e.getResponseHeaders();
        h.set("Content-Type", "application/json; charset=utf-8");
        h.set("Access-Control-Allow-Origin", "*");
        h.set("Access-Control-Allow-Headers", "Content-Type");
        h.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        if (e.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
            e.sendResponseHeaders(204, -1);
            return;
        }
        byte[] b = body.getBytes(StandardCharsets.UTF_8);
        e.sendResponseHeaders(status, b.length);
        try (OutputStream o = e.getResponseBody()) {
            o.write(b);
        }
    }
}
