import { Rule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Duration, Stack, StackProps } from '@aws-cdk/core';
import * as path from 'path';

export class SetupPipelineStack extends Stack {
    constructor(app: App, id: string, props?: StackProps) {
        super(app, id, props);

        // defines an AWS Lambda resource
        const lambdaPipeline = new NodejsFunction(this, 'CodePipeline-Lambda', {
            runtime: Runtime.NODEJS_14_X,
            entry: `${path.resolve(__dirname)}/pipeline-lambda/handler.ts`,
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
            },
            handler: 'handler',
            bundling: {
                nodeModules: ['aws-cdk', '@aws-cdk/aws-s3', '@aws-cdk/core', 'jsonschema'],
            },
            timeout: Duration.seconds(900),
            memorySize: 512,
        });

        lambdaPipeline.role!.addManagedPolicy(
            ManagedPolicy.fromManagedPolicyName(this, 'SecretsManagerReadAccess', 'SecretsManagerReadAccess')
        );
        lambdaPipeline.role!.addManagedPolicy(
            ManagedPolicy.fromManagedPolicyArn(this, 'AmazonS3FullAccess', 'arn:aws:iam::aws:policy/AmazonS3FullAccess')
        );
        lambdaPipeline.role!.addManagedPolicy(
            ManagedPolicy.fromManagedPolicyArn(
                this,
                'AmazonSSMReadOnlyAccess',
                'arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess'
            )
        );
        lambdaPipeline.role!.addManagedPolicy(
            ManagedPolicy.fromManagedPolicyArn(this, 'AWSLambdaFullAccess', 'arn:aws:iam::aws:policy/AWSLambdaFullAccess')
        );
        lambdaPipeline.role!.addManagedPolicy(
            ManagedPolicy.fromManagedPolicyArn(
                this,
                'AWSCloudFormationFullAccess',
                'arn:aws:iam::aws:policy/AWSCloudFormationFullAccess'
            )
        );
        lambdaPipeline.role!.addManagedPolicy(
            ManagedPolicy.fromManagedPolicyArn(
                this,
                'AWSCodePipelineFullAccess',
                'arn:aws:iam::aws:policy/AWSCodePipelineFullAccess'
            )
        );

        //  cloudwatch event rule
        const eventRule = new Rule(this, 'EventRule', {
            description: 'EventRule to trigger CreatePipeline lambda',
            eventPattern: {
                source: ['aws.codecommit'],
                detailType: ['CodeCommit Repository State Change'],
                detail: {
                    event: ['referenceDeleted', 'referenceCreated'],
                    referenceType: ['branch'],
                },
            },
            enabled: true,
            ruleName: 'CreatePipelineRule',
            targets: [new LambdaFunction(lambdaPipeline)],
        });
    }
}
