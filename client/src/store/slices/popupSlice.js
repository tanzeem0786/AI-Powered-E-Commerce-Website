import { createSlice } from "@reduxjs/toolkit";

const popupSlice = createSlice({
  name: "popup",
  initialState: {
    isAuthPopupOpen: false,
    isSidebarOpen: false,
    isSearchBarOpen: false,
    isCartOpen: false,
    isAIPopupOpen: false,
  },
  reducers: {
    toggleAuthPopup(state) {
      state.isAuthPopupOpen = !state.isAuthPopupOpen;
    },
    closeAuthPopup(state) {
      state.isAuthPopupOpen = false;
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen
    },
    toggleSearchBar(state) {
      state.isSearchBarOpen = !state.isSearchBarOpen;
    },
    toggleCart(state) {
      state.isCartOpen = !state.isCartOpen;
    },
    toggleAIModal(state) {
      state.isAIPopupOpen = !state.isAIPopupOpen;
    },
    closeAIModal(state) {
      state.isAIPopupOpen = false;
    }
  },
});

export const {
  toggleAuthPopup,
  closeAuthPopup,
  toggleSidebar,
  toggleSearchBar,
  toggleCart,
  toggleAIModal,
  closeAIModal,
} = popupSlice.actions;
export default popupSlice.reducer;
