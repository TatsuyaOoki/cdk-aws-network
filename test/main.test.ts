import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as dotenv from "dotenv";
import { AppStack } from "../src/lib/stacks/app-stack";
import { devParameter } from "../src/parameter";

dotenv.config();

describe("AppStackTest", () => {
  let template: Template;

  // Creation of test CloudFormation templates
  beforeAll(() => {
    const app = new App();
    const stack = new AppStack(app, "AppStack", {
      env: {
        account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
        region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
      },
      vpcCidr: devParameter.vpcCidr,
    });
    template = Template.fromStack(stack);
  });

  // Test
  test("Snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  test("VpcCount", () => {
    template.resourceCountIs("AWS::EC2::VPC", 1);
  });

  test("VpcParameter", () => {
    template.hasResourceProperties("AWS::EC2::VPC", {
      CidrBlock: devParameter.vpcCidr,
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test("SubnetParameterCount", () => {
    template.resourcePropertiesCountIs(
      "AWS::EC2::Subnet",
      {
        MapPublicIpOnLaunch: true,
      },
      2,
    );
    template.resourcePropertiesCountIs(
      "AWS::EC2::Subnet",
      {
        MapPublicIpOnLaunch: false,
      },
      4,
    );
  });
});
