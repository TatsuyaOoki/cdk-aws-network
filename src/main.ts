import * as cdk from "aws-cdk-lib";
import { AppStack } from "./lib/stacks/app-stack";
import { devParameter } from "./parameter";

const app = new cdk.App();

new AppStack(app, "CdkNetwork", {
  env: {
    account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    CreateBy: "CDK",
    Repository: devParameter.repository,
    Project: devParameter.projectName,
    Environment: devParameter.envName,
  },

  vpcCidr: devParameter.vpcCidr,
});

app.synth();
