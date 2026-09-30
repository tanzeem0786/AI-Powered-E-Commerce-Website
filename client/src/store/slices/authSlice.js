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
    errors: {},
    isSigningUp: false,
    isLoggingIn: false,
    isLoggingOut: false,
    isUpdatingProfile: false,
    isUpdatingPassword: false,
    isRequestingForToken: false,
    isCheckingAuth: true,
  },
  reducers: {
    clearAuthSession(state) {
      state.authUser = null;
      state.isCheckingAuth = false;
      state.errors = {};
    },
    clearAuthError(state, action) {
      if (action.payload) delete state.errors[action.payload];
      else state.errors = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isSigningUp = true;
        delete state.errors.register;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isSigningUp = false;
        state.authUser = action.payload;
        delete state.errors.register;
      })
      .addCase(register.rejected, (state, action) => {
        state.isSigningUp = false;
        state.errors.register = action.payload || action.error.message;
      })
      .addCase(login.pending, (state) => {
        state.isLoggingIn = true;
        delete state.errors.login;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoggingIn = false;
        state.authUser = action.payload;
        delete state.errors.login;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoggingIn = false;
        state.errors.login = action.payload || action.error.message;
      })
      .addCase(getUser.pending, (state) => {
        state.isCheckingAuth = true;
        delete state.errors.session;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.authUser = action.payload;
        delete state.errors.session;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.isCheckingAuth = false;
        state.authUser = null;
        state.errors.session = action.payload || action.error.message;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoggingOut = false;
        state.authUser = null;
      })
      .addCase(logout.pending, (state) => {
        state.isLoggingOut = true;
        delete state.errors.logout;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoggingOut = false;
        state.errors.logout = action.payload || action.error.message;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isRequestingForToken = true;
        delete state.errors.forgotPassword;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isRequestingForToken = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isRequestingForToken = false;
        state.errors.forgotPassword = action.payload || action.error.message;
      })
      .addCase(resetPassword.pending, (state) => {
        state.isUpdatingPassword = true;
        delete state.errors.resetPassword;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isUpdatingPassword = false;
        state.authUser = action.payload;
        delete state.errors.resetPassword;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isUpdatingPassword = false;
        state.errors.resetPassword = action.payload || action.error.message;
      })
      .addCase(updatePassword.pending, (state) => {
        state.isUpdatingPassword = true;
        delete state.errors.updatePassword;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        state.isUpdatingPassword = false;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.isUpdatingPassword = false;
        state.errors.updatePassword = action.payload || action.error.message;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isUpdatingProfile = true;
        delete state.errors.updateProfile;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isUpdatingProfile = false;
        state.authUser = action.payload;
        delete state.errors.updateProfile;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isUpdatingProfile = false;
        state.errors.updateProfile = action.payload || action.error.message;
      });
  },
});

export const { clearAuthSession, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
