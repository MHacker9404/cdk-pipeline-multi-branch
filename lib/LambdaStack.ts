import { Effect, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Duration, Stack, StackProps } from '@aws-cdk/core';
import * as path from 'path';

export class LambdaStack extends Stack {
    constructor(app: App, id: string, props?: StackProps) {
        super(app, id, props);

        // defines an AWS Lambda resource
        const lambdaBucket = new NodejsFunction(this, 'LambdaBucket', {
            runtime: Runtime.NODEJS_14_X,
            entry: `${path.resolve(__dirname)}/lambda/handler.ts`,
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
            },
            handler: 'handler',
            bundling: {
                nodeModules: ['aws-cdk', '@aws-cdk/aws-s3', '@aws-cdk/core', 'jsonschema', 'yarn'],
                // forceDockerBundling: true,
                // metafile: true,
            },
            timeout: Duration.seconds(900),
            memorySize: 512,
        });
        const secretsReadAccess = ManagedPolicy.fromManagedPolicyName(
            this,
            'SecretsManagerReadAccess',
            'SecretsManagerReadAccess'
        );
        lambdaBucket.role!.addManagedPolicy(secretsReadAccess);
        const s3FullAccessPolicy = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        );
        lambdaBucket.role!.addManagedPolicy(s3FullAccessPolicy);
        const ssmReadOnlyPolicy = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AmazonSSMReadOnlyAccess',
            'arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess'
        );
        lambdaBucket.role!.addManagedPolicy(ssmReadOnlyPolicy);
    }
}
