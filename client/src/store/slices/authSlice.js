import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { closeAuthPopup } from "./popupSlice.js";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const rejectWithApiError = (error, thunkAPI, fallback) => {
  const message = getErrorMessage(error, fallback);
  toast.error(message);
  return thunkAPI.rejectWithValue(message);
};

export const register = createAsyncThunk("auth/register", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/register", data);
    toast.success(response.data.message);
    thunkAPI.dispatch(closeAuthPopup());
    return response.data.user;
  } catch (error) {
    return rejectWithApiError(error, thunkAPI, "Registration failed. Please try again.");
  }
});

export const login = createAsyncThunk("auth/login", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/login", data);
    toast.success(response.data.message);
    thunkAPI.dispatch(closeAuthPopup());
    return response.data.user;
  } catch (error) {
    return rejectWithApiError(error, thunkAPI, "Login failed. Please try again.");
  }
});

export const getUser = createAsyncThunk("auth/me", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/auth/me");
    return response.data.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, "Failed to restore your session."));
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/auth/logout");
    toast.success(response.data.message);
    thunkAPI.dispatch(closeAuthPopup());
    return null;
  } catch (error) {
    return rejectWithApiError(error, thunkAPI, "Failed to log out. Please try again.");
  }
});

export const forgotPassword = createAsyncThunk("auth/forgotPassword", async (email, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/password/forgot", { email });
    toast.success("Reset email sent.");
    return response.data;
  } catch (error) {
    return rejectWithApiError(error, thunkAPI, "Could not send the reset email.");
  }
});

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password, confirmPassword }, thunkAPI) => {
    try {
      const response = await axiosInstance.put(`/auth/password/reset/${token}`, {
        password,
        confirmPassword,
      });
      toast.success(response.data.message);
      return response.data.user;
    } catch (error) {
      return rejectWithApiError(error, thunkAPI, "Could not reset your password.");
    }
  }
);

export const updatePassword = createAsyncThunk("auth/updatePassword", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.put("/auth/password/update", data);
    toast.success(response.data.message);
    return null;
  } catch (error) {
    return rejectWithApiError(error, thunkAPI, "Could not update your password.");
  }
});

export const updateProfile = createAsyncThunk("auth/me/update", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.put("/auth/profile/update", data);
    toast.success(response.data.message);
    return response.data.user;
  } catch (error) {
    return rejectWithApiError(error, thunkAPI, "Could not update your profile.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isUpdatingPassword: false,
    isRequestingForToken: false,
    isCheckingAuth: true,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isSigningUp = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isSigningUp = false;
        state.authUser = action.payload;
      })
      .addCase(register.rejected, (state) => {
        state.isSigningUp = false;
      })
      .addCase(login.pending, (state) => {
        state.isLoggingIn = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoggingIn = false;
        state.authUser = action.payload;
      })
      .addCase(login.rejected, (state) => {
        state.isLoggingIn = false;
      })
      .addCase(getUser.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.authUser = action.payload;
      })
      .addCase(getUser.rejected, (state) => {
        state.isCheckingAuth = false;
        state.authUser = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.authUser = null;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isRequestingForToken = true;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isRequestingForToken = false;
      })
      .addCase(forgotPassword.rejected, (state) => {
        state.isRequestingForToken = false;
      })
      .addCase(resetPassword.pending, (state) => {
        state.isUpdatingPassword = true;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isUpdatingPassword = false;
        state.authUser = action.payload;
      })
      .addCase(resetPassword.rejected, (state) => {
        state.isUpdatingPassword = false;
      })
      .addCase(updatePassword.pending, (state) => {
        state.isUpdatingPassword = true;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        state.isUpdatingPassword = false;
      })
      .addCase(updatePassword.rejected, (state) => {
        state.isUpdatingPassword = false;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isUpdatingProfile = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isUpdatingProfile = false;
        state.authUser = action.payload;
      })
      .addCase(updateProfile.rejected, (state) => {
        state.isUpdatingProfile = false;
      });
  },
});

export default authSlice.reducer;
