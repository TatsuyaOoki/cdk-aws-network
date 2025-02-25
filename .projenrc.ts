import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-aws-network',
  projenrcTs: true,

  // deps: [], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  deps: [
    'dotenv',
  ],
  gitignore: [
    '.env',
  ],

  readme: {
    filename: 'README.md',
    contents: `# CDK Project

This is an AWS CDK project managed using **Projen**.

## 📦 Setup

### Install dependencies
\`\`\`sh
yarn install
\`\`\`

### Deploy the stack
\`\`\`sh
npx projen deploy
\`\`\`

### Run tests
\`\`\`sh
npm test
\`\`\`

## 🎯 About Projen
This project is managed using **Projen**, which automates dependency management, project structure, and best practices.

## 🚀 Useful Commands
- \`npx projen\`: Generate project files
- \`npx projen build\`: Build and tests
- \`npx projen test\`: Run tests
- \`npx projen deploy\`: Deploy the CDK stack
- \`npx projen destroy\`: Destroy the deployed stack

`
  },
});

project.synth();