-- Добавление поля is_strategic_product (стратегическая продукция) во все сущности

-- PurchaseRequest
ALTER TABLE purchase_requests ADD COLUMN is_strategic_product BOOLEAN;

-- Purchase
ALTER TABLE purchases ADD COLUMN is_strategic_product BOOLEAN;

-- Contract
ALTER TABLE contracts ADD COLUMN is_strategic_product BOOLEAN;

-- PurchasePlanItem
ALTER TABLE purchase_plan_items ADD COLUMN is_strategic_product BOOLEAN;

-- PurchasePlanItemVersion
ALTER TABLE purchase_plan_item_versions ADD COLUMN is_strategic_product BOOLEAN;

-- User
ALTER TABLE users ADD COLUMN is_strategic_product BOOLEAN;

-- Cfo
ALTER TABLE cfo ADD COLUMN is_strategic_product BOOLEAN;

-- PurchaseApproval
ALTER TABLE purchase_approvals ADD COLUMN is_strategic_product BOOLEAN;

-- PurchaseRequestApproval
ALTER TABLE purchase_request_approvals ADD COLUMN is_strategic_product BOOLEAN;

-- PurchasePlanVersion
ALTER TABLE purchase_plan_versions ADD COLUMN is_strategic_product BOOLEAN;

-- PurchasePlanItemChange
ALTER TABLE purchase_plan_item_changes ADD COLUMN is_strategic_product BOOLEAN;

