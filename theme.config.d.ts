declare const themeColors: {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
};

declare const accentColors: {
  blue: { label: string; light: string; dark: string };
  teal: { label: string; light: string; dark: string };
  violet: { label: string; light: string; dark: string };
  amber: { label: string; light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
  accentColors: typeof accentColors;
};

export default themeConfig;
