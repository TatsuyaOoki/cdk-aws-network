import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Ec2App } from '../constructs/app';
import { Network } from '../constructs/network';

export interface AppStackProps extends StackProps {
  vpcCidr: string;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const networking = new Network(this, 'Network', {
      vpcCidr: props.vpcCidr,
    });

    new Ec2App(this, 'Ec2App', {
      vpc: networking.vpc,
    });


  }
}