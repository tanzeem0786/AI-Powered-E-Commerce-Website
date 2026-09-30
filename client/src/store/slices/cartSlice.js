import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: [],
  },
  reducers: {
    addToCart(state, action) {
      const { product, quantity } = action.payload?.product
        ? action.payload
        : { product: action.payload, quantity: 1 };
      if (!product || Number(product.stock) <= 0) return;
      const quantityToAdd = Math.max(1, Math.floor(Number(quantity) || 1));
      const cartItem = state.cart.find((item) => item.id === product.id);
      if (cartItem) {
        cartItem.quantity = Math.min(cartItem.quantity + quantityToAdd, Number(product.stock));
      } else {
        state.cart.push({ ...product, quantity: Math.min(quantityToAdd, Number(product.stock)) });
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
