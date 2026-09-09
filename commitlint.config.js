/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "api",
        "mobile",
        "auth",
        "family",
        "open-finance",
        "accounts",
        "cards",
        "transactions",
        "sharing",
        "recurring-expenses",
        "categories",
        "audit-log",
        "design-system",
        "graphql-schema",
        "graphql-types",
        "config",
        "deps",
        "ci",
        "specs",
        "release"
      ]
    ]
  }
};
