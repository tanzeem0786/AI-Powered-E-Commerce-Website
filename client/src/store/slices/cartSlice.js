import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

export const refreshCart = createAsyncThunk("cart/refresh", async (_, thunkAPI) => {
  const items = thunkAPI.getState().cart.cart;
  try {
    const refreshedItems = await Promise.all(
      items.map(async (item) => {
        try {
          const response = await axiosInstance.get(`/product/singleProduct/${item.id}`);
          return { id: item.id, product: response.data.product, unavailable: false };
        } catch (error) {
          if (error.response?.status === 404) {
            return { id: item.id, product: null, unavailable: true };
          }
          throw error;
        }
      })
    );
    toast.success("Cart prices and availability refreshed.");
    return refreshedItems;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Could not refresh cart availability.";
    toast.error(message);
    return thunkAPI.rejectWithValue(message);
  }
});

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: [],
    refreshingCart: false,
    refreshError: null,
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
  extraReducers: (builder) => {
    builder
      .addCase(refreshCart.pending, (state) => {
        state.refreshingCart = true;
        state.refreshError = null;
      })
      .addCase(refreshCart.fulfilled, (state, action) => {
        state.refreshingCart = false;
        action.payload.forEach(({ id, product, unavailable }) => {
          const item = state.cart.find((cartItem) => cartItem.id === id);
          if (!item) return;
          if (unavailable || !product) {
            item.stock = 0;
            item.availabilityError = "Product no longer available.";
            return;
          }
          item.name = product.name;
          item.price = product.price;
          item.stock = product.stock;
          item.category = product.category;
          item.description = product.description;
          item.images = product.images;
          item.ratings = product.ratings;
          item.availabilityError = "";
        });
      })
      .addCase(refreshCart.rejected, (state, action) => {
        state.refreshingCart = false;
        state.refreshError = action.payload || "Could not refresh cart availability.";
      });
  },
});

export const { addToCart, removeFromCart, setCartQuantity, clearCart } = cartSlice.actions;

export default cartSlice.reducer;
