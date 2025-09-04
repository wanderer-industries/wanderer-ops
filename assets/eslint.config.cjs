module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
      prettier: require('eslint-plugin-prettier'),
      'react-refresh': require('eslint-plugin-react-refresh'),
      'simple-import-sort': require('eslint-plugin-simple-import-sort'),
      import: require('eslint-plugin-import'),
    },
    rules: {
      // ESLint Rules
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      'react/prop-types': 'off',

      // React rules
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off', // React 17+ JSX import rules

      // React Refresh Rules
      'react-refresh/only-export-components': 'warn',

      // Prettier Integration
      'prettier/prettier': 'error',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'error',
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            // `react` and packages: Things that start with a letter (or digit or underscore), or `@` followed by a letter.
            ['^react$', '^@?\\w'],
            // Absolute imports and other imports such as Vue-style `@/foo`.
            // Anything not matched in another group. (also relative imports starting with "../")
            ['^@', '^'],
            // relative imports from same folder "./" (I like to have them grouped together)
            ['^\\./'],
            // media imports
            ['^.+\\.(gif|png|svg|jpg)(\\?\\w+)?\\b$'],
            // style module imports always come last, this helps to avoid CSS order issues
            ['^\.\.\/[a-zA-Z0-9_-]+\.(scss|css)$'],
          ],
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
];
