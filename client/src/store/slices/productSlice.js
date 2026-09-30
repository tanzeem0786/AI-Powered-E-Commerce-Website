import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

export const fetchProducts = createAsyncThunk(
  "product/fetchAll",
  async (params = {}, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/product", { params });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error, "Unable to load products."));
    }
  }
);

export const fetchSingleProduct = createAsyncThunk(
  "product/fetchSingle",
  async (productId, thunkAPI) => {
    try {
      const response = await axiosInstance.get(`/product/singleProduct/${productId}`);
      return response.data.product;
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error, "Unable to load this product."));
    }
  }
);

const productSlice = createSlice({
  name: "product",
  initialState: {
    loading: false,
    productsRequestId: null,
    products: [],
    productDetails: null,
    detailLoading: false,
    detailRequestId: null,
    detailError: null,
    error: null,
    totalProducts: 0,
    topRatedProducts: [],
    newProducts: [],
    aiSearching: false,
    isReviewDeleting: false,
    isPostingReview: false,
    productReviews: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.productsRequestId = action.meta.requestId;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (state.productsRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.productsRequestId = null;
        state.products = action.payload.products;
        state.totalProducts = action.payload.totalProducts;
        state.newProducts = action.payload.newProducts;
        state.topRatedProducts = action.payload.topRatedProducts;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (state.productsRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.productsRequestId = null;
        state.error = action.payload || "Unable to load products.";
      })
      .addCase(fetchSingleProduct.pending, (state, action) => {
        state.detailLoading = true;
        state.detailRequestId = action.meta.requestId;
        state.detailError = null;
        state.productDetails = null;
      })
      .addCase(fetchSingleProduct.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        state.productDetails = action.payload;
      })
      .addCase(fetchSingleProduct.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailRequestId = null;
        state.detailError = action.payload || "Unable to load this product.";
      });
  },
});

export default productSlice.reducer;
