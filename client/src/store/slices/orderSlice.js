import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Unable to place your order.";

export const placeOrder = createAsyncThunk(
  "order/place",
  async (shipping, thunkAPI) => {
    const cart = thunkAPI.getState().cart.cart;
    try {
      const orderedItem = cart.map((item) => ({
        product: {
          id: item.id,
          name: item.name,
          images: item.images,
        },
        quantity: Number(item.quantity),
      }));
      const response = await axiosInstance.post("/order/new", { ...shipping, orderedItem });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
  {
    condition: (_, { getState }) => {
      const { placingOrder, paymentIntent } = getState().order;
      return !placingOrder && !paymentIntent;
    },
  }
);

const orderSlice = createSlice({
  name: "order",
  initialState: {
    myOrders: [],
    fetchingOrders: false,
    placingOrder: false,
    checkoutError: null,
    finalPrice: null,
    orderStep: 1,
    paymentIntent: "",
  },
  reducers: {
    clearCheckoutError(state) {
      state.checkoutError = null;
    },
    clearCheckout(state) {
      state.checkoutError = null;
      state.finalPrice = null;
      state.paymentIntent = "";
      state.placingOrder = false;
      state.orderStep = 1;
    },
    finishCheckout(state) {
      state.checkoutError = null;
      state.paymentIntent = "";
      state.placingOrder = false;
      state.orderStep = 6;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placingOrder = true;
        state.checkoutError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placingOrder = false;
        state.paymentIntent = action.payload.paymentIntent;
        state.finalPrice = action.payload.total_price;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placingOrder = false;
        state.checkoutError = action.payload || "Unable to place your order.";
      });
  },
});

export const { clearCheckoutError, clearCheckout, finishCheckout } = orderSlice.actions;
export default orderSlice.reducer;
