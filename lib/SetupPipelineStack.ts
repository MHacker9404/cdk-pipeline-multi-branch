import { Rule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Duration, Stack, StackProps } from '@aws-cdk/core';
import * as path from 'path';

export class SetupPipelineStack extends Stack {
    constructor(app: App, id: string, props?: StackProps) {
        super(app, id, props);

        //  necessary policies
        const secretsManagerReadAccess = ManagedPolicy.fromManagedPolicyName(
            this,
            'SecretsManagerReadAccess',
            'SecretsManagerReadAccess'
        );
        const s3FullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        );
        const ssmReadOnlyAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AmazonSSMReadOnlyAccess',
            'arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess'
        );
        const lambdaFullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AWSLambdaFullAccess',
            'arn:aws:iam::aws:policy/AWSLambdaFullAccess'
        );
        const cloudFormationFullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AWSCloudFormationFullAccess',
            'arn:aws:iam::aws:policy/AWSCloudFormationFullAccess'
        );
        const codePipelineFullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AWSCodePipelineFullAccess',
            'arn:aws:iam::aws:policy/AWSCodePipelineFullAccess'
        );

        // defines an AWS Lambda resource
        const lambdaPipeline = new NodejsFunction(this, 'CodePipeline-Lambda', {
            runtime: Runtime.NODEJS_14_X,
            entry: `${path.resolve(__dirname)}/pipeline-lambda/handler.ts`,
            role: new Role(this, 'LambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [
                    secretsManagerReadAccess,
                    s3FullAccess,
                    ssmReadOnlyAccess,
                    lambdaFullAccess,
                    cloudFormationFullAccess,
                    codePipelineFullAccess,
                ],
            }),
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
            },
            handler: 'handler',
            bundling: {
                nodeModules: [
                    'aws-cdk',
                    '@aws-cdk/core',
                    '@aws-cdk/aws-codebuild',
                    '@aws-cdk/aws-codecommit',
                    '@aws-cdk/aws-codepipeline',
                    '@aws-cdk/aws-codepipeline-actions',
                    '@aws-cdk/aws-events',
                    '@aws-cdk/aws-events-targets',
                    '@aws-cdk/aws-iam',
                    '@aws-cdk/aws-s3',
                    '@aws-cdk/aws-secretsmanager',
                    '@aws-cdk/aws-ssm',
                    'jsonschema',
                ],
            },
            timeout: Duration.seconds(900),
            memorySize: 512,
            depsLockFilePath: `${path.resolve(__dirname)}/../yarn.lock`,
        });

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
