import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import database from "../database/db.js";
import {v2 as cloudinary} from 'cloudinary';


//5 hours 43 mins
export const getAllUsers = catchAsyncErrors(async(req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const totalUsersResult = await database.query(
        "SELECT COUNT(*) FROM users WHERE role = $1",
        ["User"]
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    const offset = (page - 1) * 10;
    const users = await database.query(
        "SELECT id, name, email, role, avatar, created_at FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        ["User", 10, offset]
    );
    res.status(200).json({
        success: true,
        totalUsers,
        currentPage: page,
        users: users.rows,
    });
});

// 5 hours 50 mins
export const deleteUser = catchAsyncErrors(async(req, res, next) => {
    const {id} = req.params;
    const deleteUser = await database.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [id]
    );
    if(deleteUser.rows.length === 0 ) {
        return next(new ErrorHandler("User Not Found!", 404));
    }
    const avatar = deleteUser.rows[0].avatar;
    if(avatar?.public_id) {
        await cloudinary.uploader.destroy(avatar.public_id)
    }
    res.status(200).json({
        success: true,
        message: "User Deleted Successfully.",
        user: deleteUser.rows[0],
    })
}); 

// 5 hours 57 mins
export const dashboardStats = catchAsyncErrors(async(req, res, next) => {
    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0];

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = currentMonthStart;

    const totalRevenueAllTimeQuery = await database.query(
        "SELECT SUM(o.total_price) FROM orders o JOIN payments p ON p.order_id = o.id WHERE p.payment_status = 'Paid'"
    );
    const totalRevenueAllTime = parseFloat(totalRevenueAllTimeQuery.rows[0].sum || 0);

    // Total Users
    const totalUsersCountQuery = await database.query(
        "SELECT COUNT(*) FROM users WHERE role = $1",
        ["User"]
    );
    const totalUsersCount = parseInt(totalUsersCountQuery.rows[0].count || 0);

    // Order Status Counts
    const orderStatusCountQuery = await database.query(
        "SELECT order_status, COUNT(*) FROM orders GROUP BY order_status"
    );
    const orderStatusCount = {
        Processing:0,
        Shipped: 0, 
        Delivered: 0, 
        Cancelled: 0,
    };
    orderStatusCountQuery.rows.forEach((row) => {
        orderStatusCount[row.order_status] = parseInt(row.count);
    });

    // Today's Revenue
    const todayRevenueQuery = await database.query(
        "SELECT SUM(o.total_price) FROM orders o JOIN payments p ON p.order_id = o.id WHERE p.payment_status = 'Paid' AND o.created_at::date = $1",
        [todayDate]
    );
    const todayRevenue = parseFloat(todayRevenueQuery.rows[0].sum || 0);

    // Yesterday's Revenue
    const yesterdayRevenueQuery = await database.query(
       "SELECT SUM(o.total_price) FROM orders o JOIN payments p ON p.order_id = o.id WHERE p.payment_status = 'Paid' AND o.created_at::date = $1",
        [yesterdayDate]
    );
    const yesterdayRevenue = parseFloat(yesterdayRevenueQuery.rows[0].sum || 0);

    // Monthly Sales for Line Chart
    const monthlySalesQuery = await database.query(`
        SELECT 
        TO_CHAR(o.created_at, 'Mon YYYY') AS month,
        DATE_TRUNC('month', o.created_at) as date,
        SUM(o.total_price) as totalSales
        FROM orders o
        JOIN payments p ON p.order_id = o.id AND p.payment_status = 'Paid'
        GROUP BY month, date
        ORDER BY date ASC
        `);

    const monthtlySales = monthlySalesQuery.rows.map((row) => ({
        month: row.month,
        totalSales: parseFloat(row.totalSales) || 0,
    }));
    
    // Top 5 Most Sold Products
    const topSellingProductQuery = await database.query(`
        SELECT p.name,
        p.images->0->>'url' AS image,
        p.category,
        p.ratings,
        SUM(oi.quantity) AS total_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN payments pay ON pay.order_id = o.id AND pay.payment_status = 'Paid'
        JOIN products p ON p.id = oi.product_id
        GROUp BY p.name, p.images, p.category, p.ratings
        ORDER BY total_sold DESC
        LIMIT 5
        `);
    const topSellingProducts = topSellingProductQuery.rows;

    // Total Sales of Current Month
    const currentMonthSalesQuery = await database.query(
        `SELECT SUM(total_price) AS total
        FROM orders o
        JOIN payments p ON p.order_id = o.id AND p.payment_status = 'Paid'
        WHERE o.created_at >= $1 AND o.created_at < $2`,
        [currentMonthStart, currentMonthEnd]
    );
    const currentMonthSales = parseFloat(currentMonthSalesQuery.rows[0].total) || 0;

    // Products with Stock Less than or Equal to 5
    const lowStockProductQuery = await database.query(
        "SELECT id, name, category, stock FROM products WHERE stock <= 5 ORDER BY stock ASC, name ASC"
    );
    const lowStockProducts = lowStockProductQuery.rows;
    const outOfStockProducts = lowStockProducts.filter((product) => Number(product.stock) === 0);

    // Revenuew Growth Rate(%)
    const lastMonthRevenueQuery = await database.query(
        `SELECT SUM(total_price) AS total
        FROM orders o
        JOIN payments p ON p.order_id = o.id AND p.payment_status = 'Paid'
        WHERE o.created_at >= $1 AND o.created_at < $2`,
        [previousMonthStart, previousMonthEnd]
    );
    const lastMonthRevenue = parseFloat(lastMonthRevenueQuery.rows[0].total) || 0;

    let revenueGrowth = "0%";
    if(lastMonthRevenue > 0) {
        const growthRate = ((currentMonthSales - lastMonthRevenue) / lastMonthRevenue) * 100;
        revenueGrowth = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(2)}%`;
    } else if (currentMonthSales > 0) {
        revenueGrowth = "New";
    }

    // New Users this Month
    const newUsersThisMonthQuery = await database.query(
        "SELECT COUNT(*) FROM users WHERE created_at >= $1 AND role = $2",
        [currentMonthStart, "User"]
    );
    const newUsersThisMonth = parseInt(newUsersThisMonthQuery.rows[0].count) || 0;

    // Final Response
    res.status(200).json({
        success: true,
        message: "Dashboard Stats Fetched Successfully",
        totalRevenueAllTime: totalRevenueAllTime / 100,
        todayRevenue: todayRevenue / 100,
        yesterdayRevenue: yesterdayRevenue / 100,
        totalUsersCount,
        orderStatusCount,
        monthtlySales: monthtlySales.map((sale) => ({
            ...sale,
            totalSales: sale.totalSales / 100,
        })),
        currentMonthSales: currentMonthSales / 100,
        topSellingProducts,
        lowStockProducts,
        outOfStockProducts,
        revenueGrowth,
        newUsersThisMonth,
    });
});