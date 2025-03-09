import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkProps {
  vpcCidr : string;
}

export class Network extends Construct {
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);


    // ============== VPC ============================= //
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
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
    this.vpc = vpc;

  }
}
