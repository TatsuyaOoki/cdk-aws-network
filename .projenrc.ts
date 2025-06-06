import { awscdk } from "projen";
import { UpdateSnapshot } from "projen/lib/javascript";
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "main",
  name: "cdk-aws-network",
  projenrcTs: true,
  buildWorkflow: false,
  githubOptions: {
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: ["docs", "perf", "refactor", "test", "style", "fix", "feat", "chore"],
      },
    },
  },
  prettier: true,
  prettierOptions: {
    settings: {
      printWidth: 100,
    },
  },

  // deps: [], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  deps: ["dotenv"],
  gitignore: [".env"],

  tsconfig: {
    compilerOptions: {
      noUnusedLocals: false,
    },
  },

  jestOptions: {
    updateSnapshot: UpdateSnapshot.NEVER,
  },

  readme: {
    contents: `# CDK Project

This is an AWS CDK project managed using **Projen**.
By default, the configuration is as follows.
<img width="650" alt="AWS Configuration Diagram" src="https://github.com/user-attachments/assets/c5ff6d80-0427-4965-a9ad-2a514f80651d">

## 📢 Important: Do Not Edit Managed Files Manually
This project is configured using **Projen**, which automates dependency management and file generation.

### Files Managed by Projen
The following files are managed by \`projenrc.ts\`. **Do not edit them manually.**
- \`README.md\`
- \`package.json\`
- \`.gitignore\`
- \`tsconfig.json\`
- \`.eslintrc.json\`
- \`.npmignore\`
- Other configuration files

### How to Apply Changes?
1. Modify \`projenrc.ts\` to update project settings.
2. Run \`npx projen\` to regenerate all managed files.

## 📦 Setup

### Install dependencies
\`\`\`sh
yarn install
\`\`\`

### Setup Environment Variables
Before running any CDK commands, copy **.env.sample** to **.env** and update the values.
\`\`\`sh
cp .env.sample .env
\`\`\`

Edit **.env** and set your AWS Account and Region:
\`\`\`sh
"CDK_DEPLOY_ACCOUNT=123456789123",
"CDK_DEPLOY_REGION=ap-northeast-1",
\`\`\`

Enter value in devParameter in src/parameter.ts
\`\`\`sh
envName: 'Production',
repository: 'TatsuyaOoki/cdk-project',
projectName: 'xxxxx',
\`\`\`


### Build and tests
\`\`\`sh
npx projen build
\`\`\`

### Update Snapshots
If you made changes to the CDK stack and need to update the snapshot tests, run:
\`\`\`sh
npx projen test:update
\`\`\`
This will regenerate the snapshot files based on the current CDK template.

### Deploy the stack
\`\`\`sh
npx projen deploy
\`\`\`

## 🎯 About Projen
This project is managed using **Projen**, which automates dependency management, project structure, and best practices.

## 🚀 Useful Commands
- \`npx projen\`: Generate project files
- \`npx projen build\`: Build and tests
- \`npx projen test\`: Run tests
- \`npx projen deploy\`: Deploy the CDK stack
- \`npx projen destroy\`: Destroy the deployed stack

`,
  },
});

project.synth();
