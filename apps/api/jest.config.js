/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "./coverage",
  moduleNameMapper: {
    "^@common/(.*)$": "<rootDir>/src/common/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@prisma-module/(.*)$": "<rootDir>/src/prisma/$1",
    "^@auth/(.*)$": "<rootDir>/src/auth/$1",
    "^@casl/(action\\.enum|ability\\.factory|casl\\.module)$":
      "<rootDir>/src/casl/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
  },
};
