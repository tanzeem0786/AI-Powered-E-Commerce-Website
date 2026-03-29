import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: [],
  },
  reducers: {},
});

export const {addToCart} = cartSlice.actions;

export default cartSlice.reducer;
