// ESLint config untuk seluruh monorepo KuliahPintar.id
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  overrides: [
    {
      // Vue SFC — Nuxt auto-imports (ref, computed, useHead, dll) tidak perlu import eksplisit
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      env: {
        browser: true,
        // Aktifkan globals Vue 3 compiler macros (defineProps, defineEmits, dll)
        'vue/setup-compiler-macros': true,
      },
      extends: ['plugin:vue/vue3-recommended', 'prettier'],
      rules: {
        // Nuxt pages/layouts boleh single-word (index.vue, login.vue, dll)
        'vue/multi-word-component-names': 'off',
        // Nuxt auto-imports ditangani runtime — TypeScript typecheck yg validasi
        'no-undef': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': 'error',
      },
    },
    {
      // Test files — lebih longgar
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.output/',
    '.nuxt/',
    '*.config.js',
  ],
}
