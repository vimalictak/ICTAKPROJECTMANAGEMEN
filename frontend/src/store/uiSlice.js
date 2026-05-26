import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  theme: localStorage.getItem('theme') || 'light',
  commandPaletteOpen: false,
  activeModal: null,
  modalData: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setSidebarCollapsed: (state, { payload }) => { state.sidebarCollapsed = payload; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    },
    setTheme: (state, { payload }) => {
      state.theme = payload;
      localStorage.setItem('theme', payload);
      document.documentElement.classList.toggle('dark', payload === 'dark');
    },
    openCommandPalette: (state) => { state.commandPaletteOpen = true; },
    closeCommandPalette: (state) => { state.commandPaletteOpen = false; },
    openModal: (state, { payload }) => {
      state.activeModal = payload.modal;
      state.modalData = payload.data || null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
  },
});

export const {
  toggleSidebar, setSidebarCollapsed, toggleTheme, setTheme,
  openCommandPalette, closeCommandPalette, openModal, closeModal,
} = uiSlice.actions;

export const selectSidebarCollapsed = (s) => s.ui.sidebarCollapsed;
export const selectTheme = (s) => s.ui.theme;
export const selectCommandPaletteOpen = (s) => s.ui.commandPaletteOpen;
export const selectActiveModal = (s) => s.ui.activeModal;
export const selectModalData = (s) => s.ui.modalData;

export default uiSlice.reducer;
