import { readFile, writeFile } from "node:fs/promises";

// This deliberately supports this project's single-file Prisma schema. Fail rather
// than silently omit unfamiliar model fields or a new unassigned model.
const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);
const outputUrl = new URL("../prisma/ERD.md", import.meta.url);
const schema = await readFile(schemaUrl, "utf8");
const models = new Map();
for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const [, name, body] = match;
  const fields = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
    const field = line.match(/^(\w+)\s+(\w+)(\[\]|\?)?(?:\s+(.*))?$/);
    if (!field) throw new Error(`Unrecognized field in ${name}: ${line}`);
    fields.push({ name: field[1], type: field[2], suffix: field[3] ?? "", attributes: field[4] ?? "" });
  }
  const primaryKey = body.match(/@@id\(\[([^\]]+)\]/)?.[1].split(",").map((value) => value.trim()) ?? [];
  const uniqueKeys = [...body.matchAll(/@@unique\(\[([^\]]+)\]/g)].map((match) => match[1].split(",").map((value) => value.trim()));
  models.set(name, { fields, primaryKey, uniqueKeys });
}
if (!models.size) throw new Error("No Prisma models found");
const sections = [
  { title: "Identity and account access", models: ["User", "Session", "Account", "Verification", "AccountMembership"], note: "Account is Better Auth's login-provider model. FinancialAccount is the financial purpose container. Verification has no foreign-key relationship to User." },
  { title: "Financial accounts and wallet allocations", models: ["FinancialAccount", "Wallet", "AccountWallet", "Category"], note: "One wallet can fund several financial accounts through AccountWallet. Wallet currency applies to each allocation. Category parent links stay within the same financial account." },
  { title: "Transactions and recurrence", models: ["Transaction", "LedgerEntry", "RecurrenceRule", "RecurrenceOccurrence", "TransactionChange"], note: "LedgerEntry amounts are signed. Only POSTED transactions contribute to actual balances. Transfers use two entries; recurrence and transaction status are independent. TransactionChange.transactionId is a durable audit identifier, not a foreign key; liveTransactionId is the optional foreign key." },
  { title: "Budgets and sharing", models: ["Budget", "BudgetMembership", "BudgetAccount", "BudgetCategory", "BudgetPeriod", "BudgetValuation"], note: "Budgets span accounts through BudgetAccount, optionally filtered through BudgetCategory. Budget membership does not grant account membership. BudgetValuation stores reporting conversions, not financial balances." },
];
const assigned = sections.flatMap((section) => section.models);
if (new Set(assigned).size !== assigned.length) throw new Error("A model is assigned to multiple sections");
for (const name of models.keys()) {
  if (!assigned.includes(name)) throw new Error(`Assign new model ${name} to an ERD section`);
}
for (const name of assigned) {
  if (!models.has(name)) throw new Error(`ERD section references removed model ${name}`);
}
const relations = [];
for (const [child, model] of models) {
  for (const field of model.fields) {
    if (!models.has(field.type) || !field.attributes.includes("fields:")) continue;
    const keys = field.attributes.match(/fields:\s*\[([^\]]+)\]/)?.[1].split(",").map((value) => value.trim());
    if (!keys) throw new Error(`Cannot read relation ${child}.${field.name}`);
    const unique = keys.length === 1 && model.fields.find((item) => item.name === keys[0])?.attributes.includes("@unique");
    relations.push({ parent: field.type, child, field, keys, unique });
  }
}
const diagram = (section) => {
  // Include all FKs owned by this section, with compact external entity stubs.
  const edges = relations.filter((relation) => section.models.includes(relation.child));
  const external = [...new Set(edges.map((relation) => relation.parent))].filter((name) => !section.models.includes(name));
  const lines = ["```mermaid", "erDiagram", "    direction LR"];
  for (const name of [...section.models, ...external]) {
    const model = models.get(name);
    const foreignKeys = new Set(relations.filter((relation) => relation.child === name).flatMap((relation) => relation.keys));
    const scalarFields = model.fields.filter((field) => !models.has(field.type));
    const fields = section.models.includes(name) ? scalarFields : scalarFields.filter((field) => field.attributes.includes("@id") || model.primaryKey.includes(field.name));
    lines.push(`    ${name} {`);
    for (const field of fields) {
      const keys = [];
      if (field.attributes.includes("@id") || model.primaryKey.includes(field.name)) keys.push("PK");
      if (foreignKeys.has(field.name)) keys.push("FK");
      if (field.attributes.includes("@unique") || model.uniqueKeys.some((key) => key.length === 1 && key[0] === field.name)) keys.push("UK");
      const comment = field.suffix === "?" ? ' "nullable"' : "";
      lines.push(`        ${field.type} ${field.name}${keys.length ? ` ${keys.join(", ")}` : ""}${comment}`);
    }
    lines.push("    }");
  }
  for (const relation of edges) {
    const parentEnd = relation.field.suffix === "?" ? "|o" : "||";
    const childEnd = relation.unique ? "o|" : "o{";
    lines.push(`    ${relation.parent} ${parentEnd}..${childEnd} ${relation.child} : "${relation.field.name}"`);
  }
  lines.push("```");
  return lines.join("\n");
};
let output = `# Fintrack entity relationship diagrams\n\n<!-- Generated by scripts/generate-erd.mjs. Edit the Prisma schema or generator, then run pnpm db:erd. -->\n\nSource: [schema.prisma](schema.prisma). This represents the current schema draft, not necessarily the deployed database.\n\nThe model is split into four views for readability. Every model and foreign-key relationship is included. Full entities appear in their home section; entities from another section appear as primary-key-only references. Scalar fields are shown; reverse Prisma relation fields are represented by edges.\n\nRead in a Mermaid-enabled Markdown preview (for example GitHub). \`||\` means exactly one, \`|o\`/\`o|\` zero or one, and \`o{\` zero or many. Nullable fields are marked. PK = primary key, FK = foreign key, UK = single-field unique key. Composite primary keys have several PK fields. Composite unique constraints and business invariants are detailed below and in [SCHEMA_NOTES.md](SCHEMA_NOTES.md).\n\n`;
for (const section of sections) output += `## ${section.title}\n\n${section.note}\n\n${diagram(section)}\n\n`;
output += "## Enums\n\n| Enum | Values |\n| --- | --- |\n";
for (const match of schema.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const values = match[2].split("\n").map((line) => line.replace(/\/\/.*$/, "").trim()).filter(Boolean);
  output += `| ${match[1]} | ${values.join(", ")} |\n`;
}
output += "\n## Composite unique constraints\n\n| Model | Fields |\n| --- | --- |\n";
for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  for (const constraint of match[2].matchAll(/@@unique\(\[([^\]]+)\]/g)) if (constraint[1].includes(",")) output += `| ${match[1]} | ${constraint[1]} |\n`;
}
output += "\n## Maintenance\n\nAfter changing the Prisma schema, run `pnpm db:erd` and commit this file with the schema change. Run `pnpm db:erd:check` to detect stale diagrams without modifying files. When adding or renaming models, update the section assignments in the generator. Review cardinalities and layout in a Mermaid preview. Database constraints outside Prisma belong in SCHEMA_NOTES.md too.\n";
if (process.argv.includes("--check")) {
  const current = await readFile(outputUrl, "utf8").catch(() => "");
  if (current !== output) throw new Error("ERD is stale. Run pnpm db:erd.");
  console.log(`ERD is current: ${models.size} models, ${relations.length} foreign-key relationships.`);
} else {
  await writeFile(outputUrl, output);
  console.log(`Generated prisma/ERD.md: ${models.size} models, ${relations.length} foreign-key relationships.`);
}
