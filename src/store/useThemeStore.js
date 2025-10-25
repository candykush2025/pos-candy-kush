import { create } from "zustand";
import { persist } from "zustand/middleware";

const defaultTheme = {
  primaryColor: "#16a34a", // Green
  secondaryColor: "#16a34a", // Green (matching primary for consistent branding)
  mode: "system", // system, light, or dark
  isLoaded: false,
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      ...defaultTheme,

      // Set primary color (preview with immediate visual feedback)
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        // Apply immediately for preview
        setTimeout(() => get().applyTheme(), 0);
      },

      // Set secondary color (preview with immediate visual feedback)
      setSecondaryColor: (color) => {
        set({ secondaryColor: color });
        // Apply immediately for preview
        setTimeout(() => get().applyTheme(), 0);
      },

      // Set theme mode
      setMode: (mode) => {
        set({ mode });
        // Apply theme immediately when mode changes
        setTimeout(() => get().applyTheme(), 0);
      },

      // Load theme from Firebase
      loadThemeFromFirebase: async () => {
        try {
          const { db } = await import("@/lib/firebase/config");
          const { doc, getDoc } = await import("firebase/firestore");

          const themeDoc = await getDoc(doc(db, "settings", "theme"));

          if (themeDoc.exists()) {
            const themeData = themeDoc.data();
            set({
              primaryColor: themeData.primaryColor || defaultTheme.primaryColor,
              secondaryColor:
                themeData.secondaryColor || defaultTheme.secondaryColor,
              mode: themeData.mode || defaultTheme.mode,
              isLoaded: true,
            });
            get().applyTheme();
          } else {
            set({ isLoaded: true });
            get().applyTheme();
          }
        } catch (error) {
          console.error("Error loading theme from Firebase:", error);
          set({ isLoaded: true });
          get().applyTheme();
        }
      },

      // Save theme to Firebase
      saveThemeToFirebase: async () => {
        try {
          const { db } = await import("@/lib/firebase/config");
          const { doc, setDoc } = await import("firebase/firestore");

          const { primaryColor, secondaryColor, mode } = get();

          await setDoc(doc(db, "settings", "theme"), {
            primaryColor,
            secondaryColor,
            mode,
            updatedAt: new Date().toISOString(),
          });

          get().applyTheme();
          return true;
        } catch (error) {
          console.error("Error saving theme to Firebase:", error);
          throw error;
        }
      },

      // Apply theme to document (client-side only)
      applyTheme: () => {
        // Only run on client-side to prevent hydration errors
        if (typeof window === "undefined") return;

        const { primaryColor, secondaryColor, mode } = get();

        // Apply CSS variables to root
        const root = document.documentElement;

        // Check if a color is dark (returns true if dark, false if light)
        const isColorDark = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          if (!result) return false;

          const r = parseInt(result[1], 16);
          const g = parseInt(result[2], 16);
          const b = parseInt(result[3], 16);

          // Calculate relative luminance using WCAG formula
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // If luminance is less than 0.5, it's a dark color
          return luminance < 0.5;
        };

        // Convert hex to oklch color space (used by Tailwind v4)
        const hexToOklch = (hex) => {
          // Convert hex to RGB
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          if (!result) return "oklch(0.5 0 0)";

          const r = parseInt(result[1], 16) / 255;
          const g = parseInt(result[2], 16) / 255;
          const b = parseInt(result[3], 16) / 255;

          // Simple RGB to OKLCH conversion (approximate)
          // For accurate conversion, we'd need a color library, but this works for most cases
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / 2;

          let h = 0;
          let c = 0;

          if (max !== min) {
            const d = max - min;
            c = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
              case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
              case g:
                h = ((b - r) / d + 2) / 6;
                break;
              case b:
                h = ((r - g) / d + 4) / 6;
                break;
            }
          }

          // Convert to oklch format (lightness, chroma, hue in degrees)
          const lightness = l.toFixed(3);
          const chroma = (c * 0.4).toFixed(3); // Scale chroma
          const hue = (h * 360).toFixed(1);

          return `oklch(${lightness} ${chroma} ${hue})`;
        };

        // Apply primary color and determine foreground color based on brightness
        root.style.setProperty("--primary", hexToOklch(primaryColor));
        const isPrimaryDark = isColorDark(primaryColor);
        root.style.setProperty(
          "--primary-foreground",
          isPrimaryDark ? "oklch(0.985 0 0)" : "oklch(0.145 0 0)" // White for dark, dark for light
        );

        // Apply secondary color and determine foreground color based on brightness
        root.style.setProperty("--secondary", hexToOklch(secondaryColor));
        const isSecondaryDark = isColorDark(secondaryColor);
        root.style.setProperty(
          "--secondary-foreground",
          isSecondaryDark ? "oklch(0.985 0 0)" : "oklch(0.145 0 0)" // White for dark, dark for light
        );

        // Determine actual theme mode (resolve "system" to "light" or "dark")
        let actualMode = mode;
        if (mode === "system") {
          // Check system preference
          const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches;
          actualMode = prefersDark ? "dark" : "light";
        }

        // Set dark mode class
        if (actualMode === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      },

      // Reset to default theme
      resetTheme: () => {
        set(defaultTheme);
        get().applyTheme();
      },

      // Get current theme
      getTheme: () => ({
        primaryColor: get().primaryColor,
        secondaryColor: get().secondaryColor,
        mode: get().mode,
      }),
    }),
    {
      name: "theme-storage",
      version: 1, // Increment to trigger migration
      migrate: (persistedState, version) => {
        // Migrate old data to ensure proper defaults
        if (version === 0) {
          return {
            ...defaultTheme,
            ...persistedState,
            // Force green secondary if it was blue
            secondaryColor:
              persistedState.secondaryColor === "#0ea5e9"
                ? "#16a34a"
                : persistedState.secondaryColor || defaultTheme.secondaryColor,
            // Ensure mode defaults to system if not set
            mode: persistedState.mode || "system",
          };
        }
        return persistedState;
      },
    }
  )
);
