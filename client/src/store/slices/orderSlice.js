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

export const fetchOrderPaymentStatus = createAsyncThunk(
  "order/fetchPaymentStatus",
  async (orderId, thunkAPI) => {
    try {
      const response = await axiosInstance.get(`/order/${orderId}`);
      return {
        status: response.data.orders.payment_status,
        failureReason: response.data.orders.payment_failure_reason,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      return thunkAPI.rejectWithValue(message);
    }
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
    orderId: null,
    paymentStatus: null,
    paymentFailureReason: null,
  },
  reducers: {
    clearCheckoutError(state) {
      state.checkoutError = null;
    },
    clearCheckout(state) {
      state.checkoutError = null;
      state.finalPrice = null;
      state.paymentIntent = "";
      state.orderId = null;
      state.paymentStatus = null;
      state.paymentFailureReason = null;
      state.placingOrder = false;
      state.orderStep = 1;
    },
    finishCheckout(state) {
      state.checkoutError = null;
      state.paymentIntent = "";
      state.placingOrder = false;
      state.orderStep = 6;
      state.paymentStatus = "Paid";
      state.paymentFailureReason = null;
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
        state.orderId = action.payload.orderId;
        state.paymentStatus = "Pending";
        state.paymentFailureReason = null;
        state.finalPrice = action.payload.total_price;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placingOrder = false;
        state.checkoutError = action.payload || "Unable to place your order.";
      })
      .addCase(fetchOrderPaymentStatus.fulfilled, (state, action) => {
        state.paymentStatus = action.payload.status;
        state.paymentFailureReason = action.payload.failureReason || null;
      });
  },
});

export const { clearCheckoutError, clearCheckout, finishCheckout } = orderSlice.actions;
export default orderSlice.reducer;
