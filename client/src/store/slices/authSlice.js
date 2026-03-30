import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import { toggleAuthPopup } from '../../store/slices/popupSlice.js';


export const register = createAsyncThunk("auth/register", async (data, thunkAPI) => {
  try {
    const res = await axiosInstance.post("/auth/register", data);
    toast.success(res.data.message);
    thunkAPI.dispatch(toggleAuthPopup());
    return res.data.user;
  } catch (error) {
    toast.error(error.response.data.message)
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const login = createAsyncThunk("auth/login", async (data, thunkAPI) => {
  try {
    const res = await axiosInstance.post("/auth/login", data);
    toast.success(res.data.message);
    thunkAPI.dispatch(toggleAuthPopup());
    return res.data.user;
  } catch (error) {
    toast.error(error.response.data.message)
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const getUser = createAsyncThunk("auth/me", async (_, thunkAPI) => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response.data.message || "Failed to get User!");
  }
});

// 8 hours 49 mins
export const logout = createAsyncThunk("auth/logout", async (data, thunkAPI) => { 
  try {
    await axiosInstance.get("/auth/logout");
    thunkAPI.dispatch(toggleAuthPopup());
    return null;
  } catch (error) {
    toast.error(error.response.data.message)
    return thunkAPI.rejectWithValue(error.response.data.message || "Failed to Logout!");
  }
});

export const forgotPassword = createAsyncThunk("auth/forgotPassword", async (email, thunkAPI) => { 
  try {
    const res = await axiosInstance.post("/auth/password/forgot?frontendUrl=http://localhost:5173",email );
    toast.success(res.data.message);
    return null;
  } catch (error) {
    toast.error(error.response.data.message)
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const resetPassword = createAsyncThunk("auth/resetPassword", async ({token, password, confirmPassword}, thunkAPI) => { 
  try {
    const res = await axiosInstance.put(`/auth/password/reset/${token}`, {
      password,
      confirmPassword,
    });
    toast.success(res.data.message);
    return res.data.user;
  } catch (error) {
    toast.error(error.response.data.message || "Something Went Wrong! Please Try Again Later.")
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const updatePassword = createAsyncThunk("auth/updatePassword", async (data, thunkAPI) => { 
  try {
    const res = await axiosInstance.put("/auth/password/update",data);
    toast.success(res.data.message);
    return null;
  } catch (error) {
    toast.error(error.response.data.message || "Something Went Wrong! Please Try Again Later.")
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const updateProfile = createAsyncThunk("auth/me/update", async (data, thunkAPI) => { 
  try {
    const res = await axiosInstance.put("/auth/profile/update",data);
    toast.success(res.data.message);
    return res.data.user;
  } catch (error) {
    toast.error(error.response.data.message || "Something Went Wrong! Please Try Again Later.")
    return thunkAPI.rejectWithValue(error.response.data.message);
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
      state.authUser = null;
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
      state.authUser = {};
    })
    .addCase(logout.rejected, (state) => {
      state.authUser = state.authUser;
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
    .addCase(resetPassword.fulfilled, (state,action) => {
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
