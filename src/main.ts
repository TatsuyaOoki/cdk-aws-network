import { App, Stack, StackProps, aws_ec2 as ec2 } from 'aws-cdk-lib';
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config();

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // ============== VPC ============================= //
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 0,
      flowLogs: {},
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Protected',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ========= EC2 Instance Connect =============== //
    const eicSg = new ec2.SecurityGroup(this, 'EicSg', {
      vpc,
      allowAllOutbound: false,
    });

    new ec2.CfnInstanceConnectEndpoint(this, 'Eic', {
      subnetId: vpc.isolatedSubnets[0].subnetId,
      securityGroupIds: [eicSg.securityGroupId],
    });

  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEPLOY_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION,
};

const app = new App();

new MyStack(app, 'cdk-aws-network', {
  env: devEnv,
  tags: {
    CreateBy: 'CDK',
    Repository: 'TatsuyaOoki/cdk-aws-network',
    Project: 'Network',
    Environment: 'Test',
  },
});

app.synth();