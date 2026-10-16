-- ============================================================================
-- SAKURA ATELIER / KAGE STORE: DATABASE BACKEND ADMINISTRATION QUERIES
-- ============================================================================
-- Purpose:
-- Since the frontend application is exclusively customer-facing (storefront,
-- shopping cart, customer checkout, profile, and order tracking), all backend
-- category taxonomy and inventory stock operations are administered directly
-- via standard SQL queries in Oracle Database XE.
-- ============================================================================

-- ============================================================================
-- SECTION 1: CATEGORY TAXONOMY MANAGEMENT
-- ============================================================================

-- 1.1 View all current categories and their product counts
SELECT 
    c.Category_ID,
    c.Category_Name,
    c.Description,
    COUNT(p.Product_ID) AS Total_Products
FROM Category c
LEFT JOIN Product p ON c.Category_ID = p.Category_ID
GROUP BY c.Category_ID, c.Category_Name, c.Description
ORDER BY c.Category_ID;

-- 1.2 Add a new Category
-- Syntax:
-- INSERT INTO Category (Category_Name, Description) VALUES ('Category Name', 'Category Description');
INSERT INTO Category (Category_Name, Description) 
VALUES ('Audio & Hi-Fi', 'Audiophile DACs, amplifiers, and studio grade monitors');

INSERT INTO Category (Category_Name, Description) 
VALUES ('Ergonomics', 'Ergonomic wrist rests, monitor arms, and posture accessories');

COMMIT;

-- 1.3 Update an existing Category name or description
UPDATE Category
SET Description = 'High-fidelity audio equipment and studio peripherals'
WHERE Category_Name = 'Audio & Hi-Fi';

COMMIT;

-- 1.4 Delete a Category (Only if no products reference it)
-- DELETE FROM Category WHERE Category_Name = 'Ergonomics';
-- COMMIT;


-- ============================================================================
-- SECTION 2: PRODUCT MANAGEMENT
-- ============================================================================

-- 2.1 View all products with their category and price
SELECT 
    p.Product_ID,
    p.Product_Name,
    p.Brand,
    p.Price,
    c.Category_Name
FROM Product p
JOIN Category c ON p.Category_ID = c.Category_ID
ORDER BY p.Product_ID;

-- 2.2 Add a new Product
-- Example: Adding 'Studio DAC Pro' under 'Audio & Hi-Fi'
INSERT INTO Product (Product_Name, Brand, Price, Category_ID, Description)
VALUES (
    'Studio DAC Pro',
    'MONO',
    249.00,
    (SELECT Category_ID FROM Category WHERE Category_Name = 'Audio & Hi-Fi'),
    '32-bit/384kHz D/A converter with balanced 4.4mm output'
);

-- When a product is created, initialize its inventory record immediately:
INSERT INTO Inventory (Product_ID, Available_Quantity, Last_Updated_Date)
VALUES (
    (SELECT Product_ID FROM Product WHERE Product_Name = 'Studio DAC Pro'),
    50,
    CURRENT_TIMESTAMP
);

COMMIT;


-- ============================================================================
-- SECTION 3: INVENTORY STOCK OPERATIONS & MONITORING
-- ============================================================================

-- 3.1 Live Inventory Dashboard (Shows all products, categories, available stock, and health status)
SELECT 
    p.Product_ID,
    p.Product_Name,
    c.Category_Name,
    p.Price,
    NVL(i.Available_Quantity, 0) AS Stock_Units,
    CASE 
        WHEN NVL(i.Available_Quantity, 0) = 0 THEN 'OUT OF STOCK'
        WHEN NVL(i.Available_Quantity, 0) <= 15 THEN 'CRITICAL LOW'
        WHEN NVL(i.Available_Quantity, 0) <= 30 THEN 'LOW STOCK'
        ELSE 'OPTIMAL'
    END AS Stock_Health,
    i.Last_Updated_Date
FROM Product p
JOIN Category c ON p.Category_ID = c.Category_ID
LEFT JOIN Inventory i ON p.Product_ID = i.Product_ID
ORDER BY NVL(i.Available_Quantity, 0) ASC;

-- 3.2 Low Stock Alert Query (For automated alerts / restocking triggers)
SELECT 
    p.Product_ID,
    p.Product_Name,
    p.Brand,
    i.Available_Quantity,
    i.Last_Updated_Date
FROM Product p
JOIN Inventory i ON p.Product_ID = i.Product_ID
WHERE i.Available_Quantity <= 20
ORDER BY i.Available_Quantity ASC;

-- 3.3 Restock a Product (Increment quantity by N units)
-- Example: Add +50 units to 'Rise Laptop Stand'
UPDATE Inventory
SET Available_Quantity = Available_Quantity + 50,
    Last_Updated_Date = CURRENT_TIMESTAMP
WHERE Product_ID = (SELECT Product_ID FROM Product WHERE Product_Name = 'Rise Laptop Stand');

COMMIT;

-- Example: Add +100 units to 'Axis Mechanical Keyboard' (Product_ID = 1)
UPDATE Inventory
SET Available_Quantity = Available_Quantity + 100,
    Last_Updated_Date = CURRENT_TIMESTAMP
WHERE Product_ID = 1;

COMMIT;

-- 3.4 Set exact stock level for a product
UPDATE Inventory
SET Available_Quantity = 80,
    Last_Updated_Date = CURRENT_TIMESTAMP
WHERE Product_ID = 2; -- Arc Wireless Mouse

COMMIT;

-- 3.5 Bulk restock all products below safety threshold (e.g., replenish items below 20 to 50)
UPDATE Inventory
SET Available_Quantity = 50,
    Last_Updated_Date = CURRENT_TIMESTAMP
WHERE Available_Quantity < 20;

COMMIT;


-- ============================================================================
-- SECTION 4: INTEGRITY CHECKS & VERIFICATION
-- ============================================================================

-- 4.1 Verify all products have a valid Inventory record
SELECT p.Product_ID, p.Product_Name
FROM Product p
LEFT JOIN Inventory i ON p.Product_ID = i.Product_ID
WHERE i.Inventory_ID IS NULL;

-- 4.2 Stock vs Active Cart reservations (Audit check)
SELECT 
    p.Product_ID,
    p.Product_Name,
    i.Available_Quantity AS Current_Stock,
    NVL(SUM(ci.Quantity), 0) AS Units_In_Customer_Carts
FROM Product p
JOIN Inventory i ON p.Product_ID = i.Product_ID
LEFT JOIN Cart_Item ci ON p.Product_ID = ci.Product_ID
LEFT JOIN Cart c ON ci.Cart_ID = c.Cart_ID AND c.Cart_Status = 'ACTIVE'
GROUP BY p.Product_ID, p.Product_Name, i.Available_Quantity
ORDER BY p.Product_ID;
