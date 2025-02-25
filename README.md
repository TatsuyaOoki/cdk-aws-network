# CDK Project

This is an AWS CDK project managed using **Projen**.
## 📢 Important: Do Not Edit Managed Files Manually
This project is configured using **Projen**, which automates dependency management and file generation.

### Files Managed by Projen
The following files are managed by `projenrc.ts`. **Do not edit them manually.**
- `README.md`
- `package.json`
- `.gitignore`
- `tsconfig.json`
- `.eslintrc.json`
- `.npmignore`
- Other configuration files

### How to Apply Changes?
1. Modify `projenrc.ts` to update project settings.
2. Run `npx projen` to regenerate all managed files.

## 📦 Setup

### Install dependencies
```sh
yarn install
```

### Setup Environment Variables
Before running any CDK commands, copy **.env.sample** to **.env** and update the values.
```sh
cp .env.sample .env
```

Edit **.env** and set your AWS Account and Region:
```sh
"CDK_DEPLOY_ACCOUNT=123456789123",
"CDK_DEPLOY_REGION=ap-northeast-1",
```

### Deploy the stack
```sh
npx projen deploy
```

### Run tests
```sh
npm test
```

## 🎯 About Projen
This project is managed using **Projen**, which automates dependency management, project structure, and best practices.

## 🚀 Useful Commands
- `npx projen`: Generate project files
- `npx projen build`: Build and tests
- `npx projen test`: Run tests
- `npx projen deploy`: Deploy the CDK stack
- `npx projen destroy`: Destroy the deployed stack

