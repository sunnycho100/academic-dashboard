import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'lib/generated/**',
      '.agents/**', // vendored third-party skill CLI (gitignored)
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Architectural React-hooks rules (new in Next 16) fire on the legacy
    // useEffect+setState data-loading pattern that Phase 3 (Server Components /
    // Server Actions) removes. Tracked as warnings until then, not blockers.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Config files legitimately use CommonJS require().
    files: ['*.config.{js,cjs,mjs,ts}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]

export default eslintConfig
