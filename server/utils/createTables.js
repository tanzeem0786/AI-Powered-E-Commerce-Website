import { createUserTable } from "../models/userTable.js";
import { createProductsTable } from "../models/productsTable.js";
import { createOrdersTable } from "../models/ordersTable.js";
import { createOrderItemTable } from "../models/orderItemsTable.js";
import { createPaymentsTable } from "../models/paymentsTable.js";
import { createProductReviewsTable } from "../models/productReviewTable.js";
import { createShippingInfoTable } from "../models/shippingInfoTable.js";

export const createTables = async () => {
    try {
        await createUserTable();
        await createProductsTable();
        await createOrdersTable();
        await createOrderItemTable();
        await createShippingInfoTable();
        await createPaymentsTable();
        await createProductReviewsTable();
        console.log("All Tables are Created Successfully.");
    } catch (error) {
        console.error("Error Creating Tables!");
    }
}