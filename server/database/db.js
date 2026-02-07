import pkg from 'pg';

const {Client} = pkg;

const database = new Client({
    user: "postgres",
    host: process.env.DB_HOST,
    database: "mern_ecommerce_store",
    password: "Taha@786",
    port: process.env.DB_PORT,
});

try {
    await database.connect();
    console.log("Database Connected Successfully.");
} catch (error) {
    console.log("Error to Connecting Database:", error);
    process.exit(1);
}

export default database;