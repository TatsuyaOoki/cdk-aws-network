import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Ec2App } from "../constructs/app";
import { DataApp } from "../constructs/data";
import { Network } from "../constructs/network";

export interface AppStackProps extends StackProps {
  vpcCidr: string;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const networking = new Network(this, "Network", {
      vpcCidr: props.vpcCidr,
    });

    const app = new Ec2App(this, "Ec2App", {
      vpc: networking.vpc,
    });

    new DataApp(this, "DataApp", {
      vpc: networking.vpc,
      instance: app.linuxinstance,
    });
  }
}
