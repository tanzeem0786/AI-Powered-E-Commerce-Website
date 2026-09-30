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
      toast.success(response.data.message || "Order created. Complete payment to confirm it.");
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
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchMyOrders = createAsyncThunk("order/fetchMine", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/order/orders/me");
    return response.data.myOrders;
  } catch (error) {
    const message = getErrorMessage(error);
    toast.error(message);
    return thunkAPI.rejectWithValue(message);
  }
});

export const fetchOrderDetails = createAsyncThunk(
  "order/fetchDetails",
  async (orderId, thunkAPI) => {
    try {
      const response = await axiosInstance.get(`/order/${orderId}`);
      return response.data.orders;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchAdminOrders = createAsyncThunk("order/fetchAdminOrders", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/order/admin/get-all-orders");
    return response.data.allOrders || [];
  } catch (error) {
    if (error.response?.status === 404 && /no orders/i.test(error.response?.data?.message || "")) return [];
    const message = getErrorMessage(error, "Unable to load orders.");
    toast.error(message);
    return thunkAPI.rejectWithValue(message);
  }
});

export const updateAdminOrderStatus = createAsyncThunk(
  "order/updateAdminStatus",
  async ({ orderId, status }, thunkAPI) => {
    try {
      const response = await axiosInstance.put(`/order/admin/update/${orderId}`, { status });
      toast.success(response.data.message || "Order status updated.");
      return response.data.updateOrderStatus;
    } catch (error) {
      const message = getErrorMessage(error, "Unable to update order status.");
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteAdminOrder = createAsyncThunk("order/deleteAdminOrder", async (orderId, thunkAPI) => {
  try {
    const response = await axiosInstance.delete(`/order/admin/delete/${orderId}`);
    toast.success(response.data.message || "Order deleted.");
    return orderId;
  } catch (error) {
    const message = getErrorMessage(error, "Unable to delete order.");
    toast.error(message);
    return thunkAPI.rejectWithValue(message);
  }
});

const orderSlice = createSlice({
  name: "order",
  initialState: {
    myOrders: [],
    ordersLoading: false,
    ordersError: null,
    orderDetails: null,
    orderDetailsLoading: false,
    orderDetailsError: null,
    orderDetailsRequestId: null,
    fetchingOrders: false,
    fetchingOrderDetails: false,
    placingOrder: false,
    paymentProcessing: false,
    updatingOrderStatus: false,
    deletingOrder: false,
    adminOrders: [],
    adminOrdersError: null,
    adminOrdersRequestId: null,
    orderMutationError: null,
    checkoutError: null,
    finalPrice: null,
    orderStep: 1,
    paymentIntent: "",
    orderId: null,
    paymentStatus: null,
    paymentFailureReason: null,
    fetchingPaymentStatus: false,
  },
  reducers: {
    setPaymentProcessing(state, action) {
      state.paymentProcessing = action.payload;
    },
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
      .addCase(fetchOrderPaymentStatus.pending, (state) => {
        state.fetchingPaymentStatus = true;
        state.paymentProcessing = true;
      })
      .addCase(fetchOrderPaymentStatus.fulfilled, (state, action) => {
        state.fetchingPaymentStatus = false;
        state.paymentProcessing = false;
        state.paymentStatus = action.payload.status;
        state.paymentFailureReason = action.payload.failureReason || null;
      })
      .addCase(fetchOrderPaymentStatus.rejected, (state, action) => {
        state.fetchingPaymentStatus = false;
        state.paymentProcessing = false;
        state.orderDetailsError = action.payload || "Unable to refresh payment status.";
      })
      .addCase(fetchMyOrders.pending, (state) => {
        state.ordersLoading = true;
        state.fetchingOrders = true;
        state.ordersError = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.ordersLoading = false;
        state.fetchingOrders = false;
        state.myOrders = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.ordersLoading = false;
        state.fetchingOrders = false;
        state.ordersError = action.payload || "Unable to load your orders.";
      })
      .addCase(fetchOrderDetails.pending, (state, action) => {
        state.fetchingOrderDetails = true;
        state.orderDetailsLoading = true;
        state.orderDetailsError = null;
        state.orderDetailsRequestId = action.meta.requestId;
        state.orderDetails = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        if (state.orderDetailsRequestId !== action.meta.requestId) return;
        state.fetchingOrderDetails = false;
        state.orderDetailsLoading = false;
        state.orderDetailsRequestId = null;
        state.orderDetails = action.payload;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        if (state.orderDetailsRequestId !== action.meta.requestId) return;
        state.fetchingOrderDetails = false;
        state.orderDetailsLoading = false;
        state.orderDetailsRequestId = null;
        state.orderDetailsError = action.payload || "Unable to load this order.";
      })
      .addCase(fetchAdminOrders.pending, (state, action) => {
        state.fetchingOrders = true;
        state.adminOrdersError = null;
        state.adminOrdersRequestId = action.meta.requestId;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        if (state.adminOrdersRequestId !== action.meta.requestId) return;
        state.fetchingOrders = false;
        state.adminOrdersRequestId = null;
        state.adminOrders = action.payload;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        if (state.adminOrdersRequestId !== action.meta.requestId) return;
        state.fetchingOrders = false;
        state.adminOrdersRequestId = null;
        state.adminOrdersError = action.payload || "Unable to load orders.";
      })
      .addCase(updateAdminOrderStatus.pending, (state) => {
        state.updatingOrderStatus = true;
        state.orderMutationError = null;
      })
      .addCase(updateAdminOrderStatus.fulfilled, (state, action) => {
        state.updatingOrderStatus = false;
        state.adminOrders = state.adminOrders.map((order) => order.id === action.payload?.id ? { ...order, ...action.payload } : order);
      })
      .addCase(updateAdminOrderStatus.rejected, (state, action) => {
        state.updatingOrderStatus = false;
        state.orderMutationError = action.payload || "Unable to update order status.";
      })
      .addCase(deleteAdminOrder.pending, (state) => {
        state.deletingOrder = true;
        state.orderMutationError = null;
      })
      .addCase(deleteAdminOrder.fulfilled, (state, action) => {
        state.deletingOrder = false;
        state.adminOrders = state.adminOrders.filter((order) => order.id !== action.payload);
      })
      .addCase(deleteAdminOrder.rejected, (state, action) => {
        state.deletingOrder = false;
        state.orderMutationError = action.payload || "Unable to delete order.";
      });
  },
});

export const { clearCheckoutError, clearCheckout, finishCheckout, setPaymentProcessing } = orderSlice.actions;
export default orderSlice.reducer;
