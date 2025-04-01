import * as cdk from "aws-cdk-lib";
import * as backup from "aws-cdk-lib/aws-backup";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as events from "aws-cdk-lib/aws-events";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export interface DataProps {
  vpc: ec2.IVpc;
  instance: ec2.IInstance;
}

export class DataApp extends Construct {
  public readonly rdsInstance: rds.IDatabaseInstance;

  constructor(scope: Construct, id: string, props: DataProps) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;

    // ========= RDS Instance =============== //
    const rdsInstance = new rds.DatabaseInstance(this, "RdsInstance", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // default: SNAPSHOT
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_40,
      }),
      availabilityZone: props.instance.instanceAvailabilityZone,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      storageEncrypted: true,
      multiAz: false,
      publiclyAccessible: false,
      parameters: {
        character_set_client: "utf8mb4",
        character_set_connection: "utf8mb4",
        character_set_database: "utf8mb4",
        character_set_results: "utf8mb4",
        character_set_server: "utf8mb4",
        collation_connection: "utf8mb4_general_ci",
        collation_server: "utf8mb4_general_ci",
        innodb_purge_threads: "4",
        time_zone: "Asia/Tokyo",
      },
      backupRetention: cdk.Duration.days(1),
      preferredBackupWindow: "15:25-15:55",
      preferredMaintenanceWindow: "Tue:16:05-Tue:16:35",
    });
    rdsInstance.connections.allowFrom(props.instance, ec2.Port.MYSQL_AURORA);

    this.rdsInstance = rdsInstance;

    // ========= AWS Backup =============== //
    const backupVault = new backup.BackupVault(this, "BackupVault", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backupPlan = new backup.BackupPlan(this, "BackupPlan", {
      backupVault: backupVault,
    });
    backupPlan.addRule(
      new backup.BackupPlanRule({
        backupVault: backupVault,
        scheduleExpression: events.Schedule.cron({ minute: "00", hour: "16" }),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.days(1),
        deleteAfter: cdk.Duration.days(2),
      }),
    );
    new backup.BackupSelection(this, "backupSelection", {
      backupPlan: backupPlan,
      resources: [
        backup.BackupResource.fromTag("AWSBackup", "true"),
        backup.BackupResource.fromTag("Environment", "Production"),
      ],
    });
  }
}
