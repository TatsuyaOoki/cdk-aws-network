import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib';
import { IInstance } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface Ec2Props {
  vpc: ec2.IVpc;
}

export class Ec2App extends Construct {
  public readonly linuxinstance: IInstance;
  // public readonly windowsinstance: IInstance;

  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;

    // ========= EC2 Instance Connect =============== //
    const eicSecurityGroup = new ec2.SecurityGroup(this, 'EicSg', {
      vpc: props.vpc,
      allowAllOutbound: true, //EIC Endopoint does not support connections as of 2025/3.
    });

    new ec2.CfnInstanceConnectEndpoint(this, 'Eic', {
      subnetId: props.vpc.isolatedSubnets[0].subnetId,
      securityGroupIds: [eicSecurityGroup.securityGroupId],
    });


    /* ============ KeyPair ============ */
    const keyPair = new ec2.KeyPair(this, 'KeyPair', {});


    /* ============ InstanceProfile ============ */
    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      path: '/',
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy' },
      ],
    });


    /* ============ EC2 Instance for Linux ============ */

    // UserData for Linux (setup httpd)
    const linuxUserdata = ec2.UserData.forLinux({ shebang: '#!/bin/bash' });
    linuxUserdata.addCommands(
      'sudo dnf -y install httpd',
      'sudo echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html',
      'sudo chown apache:apache /var/www/html/index.html',
      'sudo systemctl enable httpd',
      'sudo systemctl start httpd',
    );

    // AMI (Linux)
    // const linuxAmi = ec2.MachineImage.latestAmazonLinux2023({
    //   cachedInContext: true,
    // });

    const linuxAmi = ec2.MachineImage.lookup({
      name: 'al2023-ami-2023.6.20241212.0-kernel-6.1-x86_64',
      owners: [
        'amazon',
        accountId,
      ],
    });

    // EC2 instance (Linux)
    const linuxInstance = new ec2.Instance(this, 'linuxInstance', {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: linuxAmi,
      role: instanceRole,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
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

    linuxInstance.connections.allowFromAnyIpv4(ec2.Port.allIcmp());
    linuxInstance.connections.allowFrom(eicSecurityGroup, ec2.Port.SSH);

    this.linuxinstance = linuxInstance;


    /* ============ EC2 Instance for Windows ============ */

    // // UserData for Windows
    // const windowsUserdata = ec2.UserData.forWindows();

    // // AMI (Windows)
    // const ws2016Ami = ec2.MachineImage.lookup({
    //   name: 'Windows_Server-2016-English-Full-Base-2024.12.13',
    //   owners: [
    //     'amazon',
    //     accountId,
    //   ]
    // });

    // EC2 instance (Windows)
    // const windowsInstance = new ec2.Instance(this, 'windowsInstance', {
    //   vpc: props.vpc,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    //   machineImage: ws2016Ami,
    //   keyPair: keyPair,
    //   role: InstanceRole,
    //   vpcSubnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    //   },
    //   securityGroup: windowsSg,
    //   userData: windowsUserdata,
    //   blockDevices: [
    //     {
    //       deviceName: '/dev/sda1',
    //       volume: ec2.BlockDeviceVolume.ebs(30, {
    //        encrypted: true,
    //        volumeType: ec2.EbsDeviceVolumeType.GP3,
    //       }),
    //     },
    //   ],
    // });

    // this.linuxinstance = windowsInstance;
  }
}
