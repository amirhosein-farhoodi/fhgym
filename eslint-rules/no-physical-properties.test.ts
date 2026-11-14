import { RuleTester } from 'eslint'
// @ts-expect-error -- plain JS rule module, intentionally untyped
import { noPhysicalProperties } from './no-physical-properties.js'

/*
 * This rule is the only thing standing between the app and a quietly broken Persian layout,
 * so it gets tested like production code. If it stops firing, RTL rots and nobody notices
 * for a month.
 *
 * RuleTester.run() registers its own describe/it blocks, so it is called at module top
 * level — wrapping it in an it() throws "Calling the suite function inside test function".
 */
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

ruleTester.run('rtl/no-physical-properties', noPhysicalProperties, {
  valid: [
    { code: 'const a = <div className="ms-4 pe-2 text-start border-s rounded-e" />' },
    { code: 'const a = <div className="md:ms-4 hover:pe-2" />' },
    { code: 'const a = cn("ps-4", isOpen && "me-2")' },
    // Near-misses that must not trip the matcher.
    { code: 'const a = <div className="rounded-lg border-lavender text-lime-500" />' },
    { code: 'const a = <div className="m-4 p-2 mx-auto" />' },
    // Strings outside a class context are none of this rule's business.
    { code: 'const label = "align left"' },
  ],
  invalid: [
    {
      code: 'const a = <div className="ml-4" />',
      errors: [{ messageId: 'physical' }],
    },
    {
      code: 'const a = <div className="flex pr-2 text-right" />',
      errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
    },
    {
      code: 'const a = cn("base", cond && "border-l-2")',
      errors: [{ messageId: 'physical' }],
    },
    {
      code: 'const a = <div className={`p-2 ${x} left-0`} />',
      errors: [{ messageId: 'physical' }],
    },
    {
      code: 'const a = <div className="md:hover:mr-4" />',
      errors: [{ messageId: 'physical' }],
    },
  ],
})
