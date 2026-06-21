'use strict';

/**
 * Custom ESLint rule: no-direct-db-write-outside-repo
 *
 * Enforces the repository pattern (see ../../rahi-docs/10-security-compliance.md).
 * Direct mutating DB calls (PowerSync `db.execute(INSERT/UPDATE/DELETE...)`,
 * Prisma/Kysely writes, raw SQL writes) are only allowed inside files under a
 * `repositories/` (or `*.repository.ts`) path. Everything else must go through a
 * repository so conflict strategy, RLS assumptions, and the offline write queue
 * stay in one place.
 *
 * Phase 0: this is a working placeholder — it catches the common offenders and is
 * tightened in Phase 1 when the real repositories land. Reports are warnings until
 * the data layer exists, then promoted to errors in the app eslintrc.
 */

const WRITE_METHODS = new Set([
  'insert',
  'insertInto',
  'update',
  'updateTable',
  'delete',
  'deleteFrom',
  'create',
  'createMany',
  'upsert',
  'executeWrite',
]);

const RAW_WRITE_RE = /\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|UPSERT)\b/i;

function isRepositoryFile(filename) {
  if (!filename || filename === '<input>') return false;
  const f = filename.replace(/\\/g, '/');
  return (
    /\/repositories?\//.test(f) ||
    /\.repository\.(t|j)sx?$/.test(f) ||
    /\/repo\//.test(f)
  );
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct database writes outside repository modules (repository pattern).',
      recommended: true,
    },
    schema: [],
    messages: {
      directWrite:
        'Direct DB write "{{name}}" outside a repository. Route mutations through a repository (see rahi-docs/10).',
      rawWrite:
        'Raw mutating SQL outside a repository. Route mutations through a repository (see rahi-docs/10).',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (isRepositoryFile(filename)) {
      return {};
    }

    return {
      MemberExpression(node) {
        if (
          node.property &&
          node.property.type === 'Identifier' &&
          WRITE_METHODS.has(node.property.name) &&
          node.parent &&
          node.parent.type === 'CallExpression' &&
          node.parent.callee === node
        ) {
          context.report({
            node: node.property,
            messageId: 'directWrite',
            data: { name: node.property.name },
          });
        }
      },
      Literal(node) {
        if (typeof node.value === 'string' && RAW_WRITE_RE.test(node.value)) {
          context.report({ node, messageId: 'rawWrite' });
        }
      },
      TemplateElement(node) {
        if (node.value && RAW_WRITE_RE.test(node.value.raw)) {
          context.report({ node, messageId: 'rawWrite' });
        }
      },
    };
  },
};
