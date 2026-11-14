/**
 * Bans physical-direction Tailwind utilities in favour of logical ones.
 *
 * This app ships Persian and English side by side, so `ml-4` is not a style choice —
 * it is a bug that only shows up for half the users. Logical properties hold only if
 * something fails the build when they slip, which is what this rule is for.
 *
 * Checks string literals in className/class JSX attributes and in cn()/clsx()/twMerge()
 * calls, which is where every class list in this codebase actually lives.
 */

/** @type {Array<{ test: RegExp, fix: string, label: string }>} */
const BANNED = [
  { test: /^-?ml-/, fix: 'ms-', label: 'margin-left' },
  { test: /^-?mr-/, fix: 'me-', label: 'margin-right' },
  { test: /^-?pl-/, fix: 'ps-', label: 'padding-left' },
  { test: /^-?pr-/, fix: 'pe-', label: 'padding-right' },
  { test: /^-?left-/, fix: 'start-', label: 'left' },
  { test: /^-?right-/, fix: 'end-', label: 'right' },
  { test: /^text-left$/, fix: 'text-start', label: 'text-align: left' },
  { test: /^text-right$/, fix: 'text-end', label: 'text-align: right' },
  { test: /^border-l(-|$)/, fix: 'border-s', label: 'border-left' },
  { test: /^border-r(-|$)/, fix: 'border-e', label: 'border-right' },
  { test: /^rounded-l(-|$)/, fix: 'rounded-s', label: 'border-radius left' },
  { test: /^rounded-r(-|$)/, fix: 'rounded-e', label: 'border-radius right' },
  { test: /^-?scroll-ml-/, fix: 'scroll-ms-', label: 'scroll-margin-left' },
  { test: /^-?scroll-mr-/, fix: 'scroll-me-', label: 'scroll-margin-right' },
  { test: /^-?scroll-pl-/, fix: 'scroll-ps-', label: 'scroll-padding-left' },
  { test: /^-?scroll-pr-/, fix: 'scroll-pe-', label: 'scroll-padding-right' },
  { test: /^float-left$/, fix: 'float-start', label: 'float: left' },
  { test: /^float-right$/, fix: 'float-end', label: 'float: right' },
  { test: /^clear-left$/, fix: 'clear-start', label: 'clear: left' },
  { test: /^clear-right$/, fix: 'clear-end', label: 'clear: right' },
]

const CLASS_FNS = new Set(['cn', 'clsx', 'classNames', 'twMerge', 'cva'])

/** Strips Tailwind variant prefixes: `md:hover:ml-4` -> `ml-4`. */
function baseUtility(token) {
  const lastColon = token.lastIndexOf(':')
  return lastColon === -1 ? token : token.slice(lastColon + 1)
}

function checkValue(context, node, raw) {
  for (const token of raw.split(/\s+/)) {
    if (!token) continue
    const utility = baseUtility(token)
    for (const rule of BANNED) {
      if (rule.test.test(utility)) {
        context.report({
          node,
          messageId: 'physical',
          data: { token, label: rule.label, fix: rule.fix },
        })
        break
      }
    }
  }
}

/** @type {import('eslint').Rule.RuleModule} */
export const noPhysicalProperties = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow physical-direction Tailwind utilities so RTL stays correct',
    },
    schema: [],
    messages: {
      physical:
        '"{{token}}" is a physical property ({{label}}) and breaks in RTL. Use "{{fix}}…" instead.',
    },
  },

  create(context) {
    let classDepth = 0

    function enterIfClassContext(node) {
      const callee = node.callee
      const name = callee.type === 'Identifier' ? callee.name : null
      if (name && CLASS_FNS.has(name)) classDepth += 1
    }

    function exitIfClassContext(node) {
      const callee = node.callee
      const name = callee.type === 'Identifier' ? callee.name : null
      if (name && CLASS_FNS.has(name)) classDepth -= 1
    }

    function isClassAttribute(node) {
      let current = node.parent
      while (current) {
        if (current.type === 'JSXAttribute') {
          const attrName = current.name?.name
          return attrName === 'className' || attrName === 'class'
        }
        // Stop climbing at an element boundary — we only care about the nearest attribute.
        if (current.type === 'JSXElement' || current.type === 'JSXFragment') return false
        current = current.parent
      }
      return false
    }

    return {
      CallExpression: enterIfClassContext,
      'CallExpression:exit': exitIfClassContext,

      Literal(node) {
        if (typeof node.value !== 'string') return
        if (classDepth > 0 || isClassAttribute(node)) checkValue(context, node, node.value)
      },

      TemplateElement(node) {
        const raw = node.value.cooked ?? node.value.raw
        if (!raw) return
        if (classDepth > 0 || isClassAttribute(node)) checkValue(context, node, raw)
      },
    }
  },
}

export default {
  rules: { 'no-physical-properties': noPhysicalProperties },
}
