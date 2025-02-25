import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as dotenv from 'dotenv';
import { AppStack } from '../src/lib/stacks/app-stack';
import { devParameter } from '../src/parameter';

dotenv.config();

test('Snapshot', () => {
  const app = new App();
  const stack = new AppStack(app, 'test', {
    env: {
      account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
      region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
    },
    vpcCidr: devParameter.vpcCidr,
  });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});