import ErrorHandler from "../middlewares/errorMiddleware.js";


export const priceConversion = (price) => {
    const priceInNumber = Number(price); // convert string price into number

    if (priceInNumber <= 0 ) {
        return false;
    }
    if (!Number.isFinite(priceInNumber)) {
        return false;
    }
    /*---- CONVERTING PRICE INTO INR IN PAISE----*/
    const rounded = Math.round(priceInNumber * 100) / 100; //validate only 2 digit after DECIMAL ex. 144.444 ❌ 144.44 ✅
    const priceInPaise = Math.round(rounded * 100); // Store price in PAISE

    return priceInPaise;
}