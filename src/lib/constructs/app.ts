import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';

export interface Ec2Props {
  vpc: ec2.IVpc;
  eicSecurityGroup: ec2.ISecurityGroup;
}

export class Ec2Instance extends Construct {
  public readonly linuxSg: ec2.ISecurityGroup;
  public readonly windowsSg: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;
    const eicSg = props.eicSecurityGroup;


    /* ============ Security Group ============ */
  
    // Security Group for Instance of linuxInstance
    const linuxSg = new ec2.SecurityGroup(this, 'linuxSg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    this.linuxSg = linuxSg;


   // Security Group for Instance of windowsInstance
    const windowsSg = new ec2.SecurityGroup(this, 'windowsSg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    this.windowsSg = windowsSg;

    // Security Group Rules of linuxInstance
    // linuxSg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp());
    linuxSg.addIngressRule(eicSg, ec2.Port.SSH);

    // Security Group Rules of windowsInstance
    windowsSg.addIngressRule(eicSg, ec2.Port.RDP);

    // Security Group Rules of EC2 Instance Connect
    eicSg.addEgressRule(linuxSg, ec2.Port.SSH);
    eicSg.addEgressRule(windowsSg, ec2.Port.RDP);



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
      ]
    });

    // EC2 instance (Linux)
    const linuxInstance = new ec2.Instance(this, 'linuxInstance', {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: linuxAmi,
      role: InstanceRole,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
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

    linuxInstance.connections.allowFromAnyIpv4(ec2.Port.icmpPing());


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
  }
}
