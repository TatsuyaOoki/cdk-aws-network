import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as scheduler_targets from "aws-cdk-lib/aws-scheduler-targets";
import { Construct } from "constructs";

export interface Ec2Props {
  vpc: ec2.IVpc;
}

export class Ec2App extends Construct {
  public readonly linuxinstance: ec2.IInstance;
  // public readonly windowsinstance: ec2.IInstance;

  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;

    // ========= EC2 Instance Connect =============== //
    const eicSecurityGroup = new ec2.SecurityGroup(this, "EicSg", {
      vpc: props.vpc,
      allowAllOutbound: true, //EIC Endopoint does not support connections as of 2025/3.
    });

    new ec2.CfnInstanceConnectEndpoint(this, "Eic", {
      subnetId: props.vpc.isolatedSubnets[0].subnetId,
      securityGroupIds: [eicSecurityGroup.securityGroupId],
    });

    /* ============ KeyPair ============ */
    const keyPair = new ec2.KeyPair(this, "KeyPair", {});

    /* ============ InstanceProfile ============ */
    const instanceRole = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      path: "/",
      managedPolicies: [
        {
          managedPolicyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
        },
        {
          managedPolicyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
        },
      ],
    });

    /* ============ EC2 Instance for Linux ============ */

    // UserData for Linux (setup httpd)
    const linuxUserdata = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    linuxUserdata.addCommands(
      "sudo dnf -y install httpd",
      'echo "<h1>Hello from $(hostname)</h1>" | sudo tee /var/www/html/index.html > /dev/null',
      "sudo chown apache:apache /var/www/html/index.html",
      "sudo systemctl enable httpd",
      "sudo systemctl start httpd",
    );

    // AMI (Linux)
    const linuxAmi = ec2.MachineImage.latestAmazonLinux2023({
      cachedInContext: true,
    });

    // const linuxAmi = ec2.MachineImage.lookup({
    //   name: 'al2023-ami-2023.6.20250303.0-kernel-6.1-x86_64',
    //   owners: [
    //     'amazon',
    //     accountId,
    //   ],
    // });

    // EC2 instance (Linux)
    const linuxInstance = new ec2.Instance(this, "linuxInstance", {
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
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    this.linuxinstance = linuxInstance;

    linuxInstance.connections.allowFromAnyIpv4(ec2.Port.allIcmp());
    linuxInstance.connections.allowFrom(eicSecurityGroup, ec2.Port.SSH);

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

    // this.windowsinstance = windowsInstance;

    // ========= Application Load Balancer =============== //

    // S3 Bucket for Access log storage
    const albLogBucket = new s3.Bucket(this, "AlbLogBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      internetFacing: true,
    });
    alb.logAccessLogs(albLogBucket);

    const albListener = alb.addListener("Listener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
    });

    albListener.addTargets("AlbTargets", {
      targets: [new elbv2targets.InstanceTarget(linuxInstance, 80)],
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
    });

    linuxInstance.connections.allowFrom(alb, ec2.Port.HTTP);

    // ========= Event Bridge Scheduler =============== //
    // EC2 Instance Auto Start
    new scheduler.Schedule(this, "AutoStart", {
      schedule: scheduler.ScheduleExpression.cron({
        weekDay: "MON-FRI",
        hour: "9",
        minute: "0",
        timeZone: cdk.TimeZone.ASIA_TOKYO,
      }),
      target: new scheduler_targets.Universal({
        service: "ec2",
        action: "StartInstances",
        input: scheduler.ScheduleTargetInput.fromObject({
          InstanceIds: [linuxInstance.instanceId],
        }),
      }),
    });

    // EC2 Instance Auto Stop
    new scheduler.Schedule(this, "AutoStop", {
      schedule: scheduler.ScheduleExpression.cron({
        weekDay: "MON-FRI",
        hour: "21",
        minute: "0",
        timeZone: cdk.TimeZone.ASIA_TOKYO,
      }),
      target: new scheduler_targets.Universal({
        service: "ec2",
        action: "StopInstances",
        input: scheduler.ScheduleTargetInput.fromObject({
          InstanceIds: [linuxInstance.instanceId],
        }),
      }),
    });
  }
}
