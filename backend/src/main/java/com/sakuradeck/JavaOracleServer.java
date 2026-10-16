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
        server.createContext("/cart", JavaOracleServer::cart);
        server.createContext("/cart/add", JavaOracleServer::cartAdd);
        server.createContext("/cart/update", JavaOracleServer::cartUpdate);
        server.createContext("/cart/remove", JavaOracleServer::cartRemove);
        server.createContext("/checkout", JavaOracleServer::checkout);
        server.createContext("/orders", JavaOracleServer::orders);
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
        try (Connection c = connection()) {
            c.setAutoCommit(false);
            try (PreparedStatement cart = c.prepareStatement("SELECT Cart_ID FROM Cart WHERE Customer_ID=?"); PreparedStatement items = c.prepareStatement("SELECT ci.Product_ID, ci.Quantity, p.Price, NVL(i.Available_Quantity,0) FROM Cart_Item ci JOIN Product p ON ci.Product_ID=p.Product_ID LEFT JOIN Inventory i ON ci.Product_ID=i.Product_ID WHERE ci.Cart_ID=? FOR UPDATE")) {
                cart.setString(1,customer(ex)); ResultSet cr=cart.executeQuery(); if(!cr.next()){error(ex,404,"Cart not found");return;} int cartId=cr.getInt(1); items.setInt(1,cartId); ResultSet r=items.executeQuery(); List<int[]> ids=new ArrayList<>(); List<Double> prices=new ArrayList<>(); double total=0; while(r.next()){int p=r.getInt(1),q=r.getInt(2),stock=r.getInt(4);if(q>stock){c.rollback();error(ex,400,"Not enough stock for product ID "+p);return;}ids.add(new int[]{p,q});prices.add(r.getDouble(3));total+=r.getDouble(3)*q;} if(ids.isEmpty()){error(ex,400,"Cart is empty");return;}
                int orderId; try(PreparedStatement o=c.prepareStatement("INSERT INTO Order_Tab (Customer_ID, Order_Status) VALUES (?, 'PROCESSING')", new String[] { "ORDER_ID" })){o.setString(1,customer(ex));o.executeUpdate();ResultSet k=o.getGeneratedKeys();if(!k.next())throw new SQLException("Order id was not returned");orderId=k.getInt(1);}
                for(int i=0;i<ids.size();i++){try(PreparedStatement oi=c.prepareStatement("INSERT INTO Order_Item (Order_ID, Product_ID, Quantity, Unit_Price) VALUES (?,?,?,?)");PreparedStatement inv=c.prepareStatement("UPDATE Inventory SET Available_Quantity=Available_Quantity-? WHERE Product_ID=?")){oi.setInt(1,orderId);oi.setInt(2,ids.get(i)[0]);oi.setInt(3,ids.get(i)[1]);oi.setDouble(4,prices.get(i));oi.executeUpdate();inv.setInt(1,ids.get(i)[1]);inv.setInt(2,ids.get(i)[0]);inv.executeUpdate();}}
                try(PreparedStatement p=c.prepareStatement("INSERT INTO Payment (Order_ID, Payment_mode, Payment_Status, Amount) VALUES (?, 'SAKURA DECK Test Wallet', 'COMPLETED', ?)")){p.setInt(1,orderId);p.setDouble(2,total);p.executeUpdate();} try(PreparedStatement d=c.prepareStatement("DELETE FROM Cart_Item WHERE Cart_ID=?")){d.setInt(1,cartId);d.executeUpdate();} c.commit(); send(ex,201,"{\"success\":true,\"order_id\":"+orderId+",\"total_amount\":"+total+"}");
            } catch(Exception e){c.rollback();throw e;}
        } catch(Exception e){sqlError(ex,e);}
    }

    private static void orders(HttpExchange ex) throws IOException {
        if (options(ex)) return;
        if (!method(ex,"GET")) return; String path=ex.getRequestURI().getPath(); int id=pathId(path,"/orders/");
        try(Connection c=connection()){if(id<0){try(PreparedStatement s=c.prepareStatement("SELECT o.Order_ID,o.Order_Date,o.Order_Status,NVL(p.Amount,0) Total_Amount FROM Order_Tab o LEFT JOIN Payment p ON o.Order_ID=p.Order_ID WHERE o.Customer_ID=? ORDER BY o.Order_Date DESC")){s.setString(1,customer(ex));ResultSet r=s.executeQuery();List<String> rows=new ArrayList<>();while(r.next())rows.add("{\"order_id\":"+r.getInt(1)+",\"order_date\":"+quote(r.getTimestamp(2))+",\"order_status\":"+quote(r.getString(3))+",\"total_amount\":"+r.getDouble(4)+"}");send(ex,200,"{\"success\":true,\"data\":["+join(rows)+"]}");}}else{try(PreparedStatement s=c.prepareStatement("SELECT o.Order_ID,o.Order_Date,o.Order_Status,NVL(p.Amount,0),p.Payment_mode FROM Order_Tab o LEFT JOIN Payment p ON o.Order_ID=p.Order_ID WHERE o.Order_ID=? AND o.Customer_ID=?")){s.setInt(1,id);s.setString(2,customer(ex));ResultSet r=s.executeQuery();if(!r.next()){error(ex,404,"Order not found");return;}List<String> items=new ArrayList<>();try(PreparedStatement i=c.prepareStatement("SELECT oi.Product_ID,p.Product_Name,oi.Quantity,oi.Unit_Price FROM Order_Item oi JOIN Product p ON oi.Product_ID=p.Product_ID WHERE oi.Order_ID=?")){i.setInt(1,id);ResultSet ir=i.executeQuery();while(ir.next())items.add("{\"product_id\":"+ir.getInt(1)+",\"product_name\":"+quote(ir.getString(2))+",\"quantity\":"+ir.getInt(3)+",\"unit_price\":"+ir.getDouble(4)+"}");}send(ex,200,"{\"success\":true,\"data\":{\"order_id\":"+r.getInt(1)+",\"order_date\":"+quote(r.getTimestamp(2))+",\"order_status\":"+quote(r.getString(3))+",\"total_amount\":"+r.getDouble(4)+",\"payment_mode\":"+quote(r.getString(5))+",\"items\":["+join(items)+"]}}");}}}catch(SQLException e){sqlError(ex,e);}
    }

    private static String productJson(ResultSet r)throws SQLException{return "{\"product_id\":"+r.getInt(1)+",\"product_name\":"+quote(r.getString(2))+",\"brand\":"+quote(r.getString(3))+",\"price\":"+r.getDouble(4)+",\"available_quantity\":"+r.getInt(5)+"}";}
    private static String cartJson(ResultSet r)throws SQLException{return "{\"cart_item_id\":"+r.getInt(1)+",\"product_id\":"+r.getInt(2)+",\"quantity\":"+r.getInt(3)+",\"product_name\":"+quote(r.getString(4))+",\"brand\":"+quote(r.getString(5))+",\"price\":"+r.getDouble(6)+",\"available_quantity\":"+r.getInt(7)+"}";}
    private static String quote(Object value){if(value==null)return"null";String s=value instanceof Timestamp?new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX").format((Timestamp)value):String.valueOf(value);return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n")+"\"";}
    private static String join(List<String> v){return String.join(",",v);}
    private static String env(String key,String fallback){String v=System.getenv(key);if(v==null||v.trim().isEmpty())v=DOTENV.getProperty(key);return v==null||v.trim().isEmpty()?fallback:v.trim();}
    private static Properties loadDotEnv(){Properties p=new Properties();java.io.File f=new java.io.File(".env");if(!f.isFile())return p;try(java.io.BufferedReader r=new java.io.BufferedReader(new java.io.FileReader(f))){String line;while((line=r.readLine())!=null){line=line.trim();if(line.isEmpty()||line.startsWith("#"))continue;int i=line.indexOf('=');if(i>0)p.setProperty(line.substring(0,i).trim(),line.substring(i+1).trim());}}catch(IOException ignored){}return p;}
    private static String customer(HttpExchange e){String c=query(e,"customer_id");return c.isEmpty()?CUSTOMER:c;}
    private static String query(HttpExchange e,String key){String q=e.getRequestURI().getRawQuery();if(q==null)return"";for(String p:q.split("&")){String[]kv=p.split("=",2);if(kv.length==2&&kv[0].equals(key))try{return URLDecoder.decode(kv[1],"UTF-8");}catch(Exception ignored){}}return"";}
    private static int pathId(String path,String prefix){if(!path.startsWith(prefix))return-1;try{return Integer.parseInt(path.substring(prefix.length()));}catch(Exception e){return-1;}}
    private static Map<String,String> body(HttpExchange e)throws IOException{String s=read(e.getRequestBody());Map<String,String>m=new HashMap<>();Matcher x=Pattern.compile("\\\"(product_id|quantity|customer_id)\\\"\\s*:\\s*(?:\\\"([^\\\"]*)\\\"|(-?\\d+))").matcher(s);while(x.find())m.put(x.group(1),x.group(2)!=null?x.group(2):x.group(3));return m;}
    private static String read(InputStream in)throws IOException{byte[]b=new byte[8192];StringBuilder s=new StringBuilder();int n;while((n=in.read(b))>0)s.append(new String(b,0,n,StandardCharsets.UTF_8));return s.toString();}
    private static int integer(String v,int fallback){try{return Integer.parseInt(v);}catch(Exception e){return fallback;}}
    private static boolean options(HttpExchange e)throws IOException{if(e.getRequestMethod().equalsIgnoreCase("OPTIONS")){send(e,204,"");return true;}return false;}
    private static boolean method(HttpExchange e,String expected)throws IOException{if(!e.getRequestMethod().equalsIgnoreCase(expected)){send(e,405,"{\"success\":false,\"error\":\"Method not allowed\"}");return false;}return true;}
    private static void notFound(HttpExchange e)throws IOException{error(e,404,"Not found");}
    private static void error(HttpExchange e,int status,String message)throws IOException{send(e,status,"{\"success\":false,\"error\":"+quote(message)+"}");}
    private static void sqlError(HttpExchange e,Exception error)throws IOException{error.printStackTrace();error(e,503,"Database service unavailable");}
    private static void send(HttpExchange e,int status,String body)throws IOException{Headers h=e.getResponseHeaders();h.set("Content-Type","application/json; charset=utf-8");h.set("Access-Control-Allow-Origin","*");h.set("Access-Control-Allow-Headers","Content-Type");h.set("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");if(e.getRequestMethod().equalsIgnoreCase("OPTIONS")){e.sendResponseHeaders(204,-1);return;}byte[]b=body.getBytes(StandardCharsets.UTF_8);e.sendResponseHeaders(status,b.length);try(OutputStream o=e.getResponseBody()){o.write(b);}}
}
