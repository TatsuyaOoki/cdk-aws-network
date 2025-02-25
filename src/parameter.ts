import { Environment } from 'aws-cdk-lib';
import * as dotenv from 'dotenv';

export interface AppParameter {
  env?: Environment;
  envName: string;
  repository: string;
  projectName: string;
  vpcCidr: string;
}

dotenv.config();


export const devParameter: AppParameter = {
  env: {
    account: process.env.CDK_PROD_ACCOUNT,
    region: process.env.CDK_PROD_REGION,
  },
  envName: 'Develop',
  repository: 'TatsuyaOoki/cdk-aws-network',
  projectName: 'template',

  vpcCidr: '10.0.0.0/16',
};
