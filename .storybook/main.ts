import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook for the shell. Stories live beside the source (`src/**\/*.stories.tsx`) and
 * are excluded from the published package twice over: tsup bundles only the two entry
 * files, and `files` in package.json ships `dist` + `styles.css` alone.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
};

export default config;
