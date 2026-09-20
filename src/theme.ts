import { Appearance, Platform } from "react-native";

const storedDarkModePreference = Platform.OS === "web" && typeof localStorage !== "undefined"
  ? localStorage.getItem("conversation-escape.dark-mode")
  : null;

const lightColors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceRaised: "#F7F7F7",
  primary: "#D12835",
  primaryDark: "#B51F2A",
  text: "#101010",
  textMuted: "#5C5C63",
  success: "#D12835",
  danger: "#D12835",
  border: "#E6E6E6",
  black: "#101010",
} as const;

const darkColors = {
  background: "#101010",
  surface: "#191919",
  surfaceRaised: "#252525",
  primary: "#F04A55",
  primaryDark: "#FF717A",
  text: "#FFFFFF",
  textMuted: "#BDBDBD",
  success: "#F04A55",
  danger: "#F04A55",
  border: "#3A3A3A",
  black: "#101010",
} as const;

export const isDarkMode = Platform.OS === "web"
  ? storedDarkModePreference === "true"
  : Appearance.getColorScheme() === "dark";

export const colors = isDarkMode ? darkColors : lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;
