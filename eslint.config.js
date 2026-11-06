import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["coverage/**", "client/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_|^next$" }]
    }
  },
  {
    files: ["test/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } }
  }
];
