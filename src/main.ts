import { App, Stack, StackProps, aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config();

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const accountId = cdk.Stack.of(this).account;

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

    /* ============ KeyPair ============ */
    const keyPair = new ec2.KeyPair(this, 'KeyPair', {});


    /* ============ InstanceProfile ============ */
    const InstanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      path: '/',
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy' },
      ],
    });

    /* ============ EC2 Instance ============ */
    const linuxSg = new ec2.SecurityGroup(this, 'linuxSg', {
      vpc: vpc,
      allowAllOutbound: true,
    });

    const linuxAmi = ec2.MachineImage.lookup({
      name: 'al2023-ami-2023.6.20241212.0-kernel-6.1-x86_64',
      owners: [
        'amazon',
        accountId,
      ],
    });

    const linuxUserdata = ec2.UserData.forLinux({ shebang: '#!/bin/bash' });
    linuxUserdata.addCommands(
      'sudo dnf -y install httpd',
      'sudo echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html',
      'sudo chown apache:apache /var/www/html/index.html',
      'sudo systemctl enable httpd',
      'sudo systemctl start httpd',
    );

    new ec2.Instance(this, 'linuxInstance', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: linuxAmi,
      role: InstanceRole,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: linuxSg,
      userData: linuxUserdata,
      keyPair: keyPair,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });
    linuxSg.addIngressRule(eicSg, ec2.Port.SSH);
    linuxSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.HTTP);
    eicSg.addEgressRule(linuxSg, ec2.Port.SSH);

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