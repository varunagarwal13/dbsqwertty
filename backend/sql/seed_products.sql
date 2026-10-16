
INSERT INTO Category (Category_Name, Description) 
SELECT 'Keyboards', 'Mechanical keyboards and accessories' FROM DUAL 
WHERE NOT EXISTS (SELECT 1 FROM Category WHERE Category_Name = 'Keyboards');

INSERT INTO Category (Category_Name, Description) 
SELECT 'Mice & Accessories', 'Precision pointing devices' FROM DUAL 
WHERE NOT EXISTS (SELECT 1 FROM Category WHERE Category_Name = 'Mice & Accessories');

INSERT INTO Category (Category_Name, Description) 
SELECT 'Lighting', 'Desk and monitor lights' FROM DUAL 
WHERE NOT EXISTS (SELECT 1 FROM Category WHERE Category_Name = 'Lighting');

INSERT INTO Category (Category_Name, Description) 
SELECT 'Desk Essentials', 'Workspace organization and stands' FROM DUAL 
WHERE NOT EXISTS (SELECT 1 FROM Category WHERE Category_Name = 'Desk Essentials');


INSERT INTO Product (Product_Name, Brand, Price, Category_ID, Description)
SELECT 'Rise Laptop Stand', 'MONO', 99.00, (SELECT Category_ID FROM Category WHERE Category_Name = 'Desk Essentials'), 'Solid aluminum · Adjustable angle' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE Product_Name = 'Rise Laptop Stand');

INSERT INTO Product (Product_Name, Brand, Price, Category_ID, Description)
SELECT 'Felt Desk Mat', 'MONO', 49.00, (SELECT Category_ID FROM Category WHERE Category_Name = 'Desk Essentials'), 'Merino wool blend · 80 x 40 cm' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE Product_Name = 'Felt Desk Mat');

INSERT INTO Product (Product_Name, Brand, Price, Category_ID, Description)
SELECT 'Pulse Wireless Charger', 'MONO', 59.00, (SELECT Category_ID FROM Category WHERE Category_Name = 'Desk Essentials'), '15W fast charging · USB-C input' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE Product_Name = 'Pulse Wireless Charger');

INSERT INTO Product (Product_Name, Brand, Price, Category_ID, Description)
SELECT 'Beam Monitor Light', 'MONO', 119.00, (SELECT Category_ID FROM Category WHERE Category_Name = 'Lighting'), 'Screen-mounted · Glare-free light' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE Product_Name = 'Beam Monitor Light');

INSERT INTO Product (Product_Name, Brand, Price, Category_ID, Description)
SELECT 'Link USB-C Cable', 'MONO', 29.00, (SELECT Category_ID FROM Category WHERE Category_Name = 'Desk Essentials'), 'Braided finish · 2 m · 100W' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE Product_Name = 'Link USB-C Cable');


INSERT INTO Inventory (Product_ID, Available_Quantity)
SELECT Product_ID, 50 FROM Product WHERE Product_Name = 'Rise Laptop Stand'
  AND NOT EXISTS (SELECT 1 FROM Inventory WHERE Product_ID = (SELECT Product_ID FROM Product WHERE Product_Name = 'Rise Laptop Stand'));

INSERT INTO Inventory (Product_ID, Available_Quantity)
SELECT Product_ID, 100 FROM Product WHERE Product_Name = 'Felt Desk Mat'
  AND NOT EXISTS (SELECT 1 FROM Inventory WHERE Product_ID = (SELECT Product_ID FROM Product WHERE Product_Name = 'Felt Desk Mat'));

INSERT INTO Inventory (Product_ID, Available_Quantity)
SELECT Product_ID, 75 FROM Product WHERE Product_Name = 'Pulse Wireless Charger'
  AND NOT EXISTS (SELECT 1 FROM Inventory WHERE Product_ID = (SELECT Product_ID FROM Product WHERE Product_Name = 'Pulse Wireless Charger'));

INSERT INTO Inventory (Product_ID, Available_Quantity)
SELECT Product_ID, 25 FROM Product WHERE Product_Name = 'Beam Monitor Light'
  AND NOT EXISTS (SELECT 1 FROM Inventory WHERE Product_ID = (SELECT Product_ID FROM Product WHERE Product_Name = 'Beam Monitor Light'));

INSERT INTO Inventory (Product_ID, Available_Quantity)
SELECT Product_ID, 200 FROM Product WHERE Product_Name = 'Link USB-C Cable'
  AND NOT EXISTS (SELECT 1 FROM Inventory WHERE Product_ID = (SELECT Product_ID FROM Product WHERE Product_Name = 'Link USB-C Cable'));
