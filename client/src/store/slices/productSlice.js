import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
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

export const searchProductsWithAI = createAsyncThunk(
  "product/searchWithAI",
  async (userPrompt, thunkAPI) => {
    try {
      const response = await axiosInstance.post("/product/ai-search", { userPrompt });
      const data = response.data;
      if (data?.success !== true || !Array.isArray(data.product)) {
        return thunkAPI.rejectWithValue({
          kind: "invalid",
          message: data?.message || "The AI returned an invalid product response. Please try again.",
        });
      }

      const invalidProduct = data.product.some((product) =>
        !product ||
        typeof product.id !== "string" ||
        typeof product.name !== "string" ||
        !Number.isFinite(Number(product.price)) ||
        !Number.isFinite(Number(product.stock))
      );
      if (invalidProduct) {
        return thunkAPI.rejectWithValue({
          kind: "invalid",
          message: "The AI response included invalid product data. Please try a different prompt.",
        });
      }

      const message = data.product.length === 0 && !/no product|no match/i.test(data.message || "")
        ? "Try describing a different product, category, feature, or budget."
        : data.message;
      return { products: data.product, message };
    } catch (error) {
      const message = getErrorMessage(error, "AI search is temporarily unavailable.");
      const status = error.response?.status;
      const kind = status === 401 || status === 403
        ? "auth"
        : status === 429 || /quota|rate.?limit|429/i.test(message)
          ? "quota"
          : "api";
      return thunkAPI.rejectWithValue({ kind, message });
    }
  }
);

export const submitProductReview = createAsyncThunk(
  "product/submitReview",
  async ({ productId, rating, comment }, thunkAPI) => {
    try {
      const response = await axiosInstance.put(`/product/post-new/review/${productId}`, { rating, comment });
      toast.success(response.data.message);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, "Unable to submit your review.");
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteProductReview = createAsyncThunk(
  "product/deleteReview",
  async (productId, thunkAPI) => {
    try {
      const response = await axiosInstance.delete(`/product/delete/review/${productId}`);
      toast.success(response.data.message);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, "Unable to delete your review.");
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
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
    aiResults: [],
    aiSearchError: null,
    aiSearchRequestId: null,
    aiSearchMessage: "",
    aiSearchCompleted: false,
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
      })
      .addCase(searchProductsWithAI.pending, (state, action) => {
        state.aiSearching = true;
        state.aiResults = [];
        state.aiSearchError = null;
        state.aiSearchMessage = "";
        state.aiSearchCompleted = false;
        state.aiSearchRequestId = action.meta.requestId;
      })
      .addCase(searchProductsWithAI.fulfilled, (state, action) => {
        if (state.aiSearchRequestId !== action.meta.requestId) return;
        state.aiSearching = false;
        state.aiSearchRequestId = null;
        state.aiResults = action.payload.products;
        state.aiSearchMessage = action.payload.message || "";
        state.aiSearchCompleted = true;
      })
      .addCase(searchProductsWithAI.rejected, (state, action) => {
        if (state.aiSearchRequestId !== action.meta.requestId) return;
        state.aiSearching = false;
        state.aiSearchRequestId = null;
        state.aiSearchError = action.payload || {
          kind: "api",
          message: action.error.message || "AI search is temporarily unavailable.",
        };
      })
      .addCase(submitProductReview.pending, (state) => {
        state.isPostingReview = true;
      })
      .addCase(submitProductReview.fulfilled, (state) => {
        state.isPostingReview = false;
      })
      .addCase(submitProductReview.rejected, (state) => {
        state.isPostingReview = false;
      })
      .addCase(deleteProductReview.pending, (state) => {
        state.isReviewDeleting = true;
      })
      .addCase(deleteProductReview.fulfilled, (state) => {
        state.isReviewDeleting = false;
      })
      .addCase(deleteProductReview.rejected, (state) => {
        state.isReviewDeleting = false;
      });
  },
});

export default productSlice.reducer;
