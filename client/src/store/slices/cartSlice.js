import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: [],
  },
  reducers: {
    addToCart(state, action) {
      const product = action.payload;
      if (!product || Number(product.stock) <= 0) return;
      const cartItem = state.cart.find((item) => item.id === product.id);
      if (cartItem) {
        cartItem.quantity = Math.min(cartItem.quantity + 1, Number(product.stock));
      } else {
        state.cart.push({ ...product, quantity: 1 });
      }
    },
    removeFromCart(state, action) {
      state.cart = state.cart.filter((item) => item.id !== action.payload);
    },
    setCartQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const item = state.cart.find((cartItem) => cartItem.id === productId);
      if (!item) return;
      item.quantity = Math.max(1, Math.min(Number(quantity), Number(item.stock)));
    },
    clearCart(state) {
      state.cart = [];
    },
  },
});

export const { addToCart, removeFromCart, setCartQuantity, clearCart } = cartSlice.actions;

export default cartSlice.reducer;
