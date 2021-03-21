#!/usr/bin/env node
import { App, Tags } from '@aws-cdk/core';
import 'source-map-support/register';
// import { S3LambdaStack } from '../lib/S3LambdaStack';
import { SetupPipelineStack } from '../lib/SetupPipelineStack';
import { CodePipelineStack } from '../lib/pipeline-lambda/CodePipelineStack';

const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};
console.log(env);

const app = new App({ context: env });

// new S3LambdaStack(app, 'S3-Lambda-Stack');
new SetupPipelineStack(app, 'Setup-CodePipeline', {
    description: 'Lambda to generate CodePipelines',
});

const repo = app.node.tryGetContext('repo') || null;
const branch = app.node.tryGetContext('branch') || null;
const branch2 = branch.includes('/') ? branch.split('/')[1] : branch;

const pipeline = new CodePipelineStack(app, `Pipeline-${repo}-${branch2}`, { env, repo, branch });

Tags.of(app).add('App', 'pipeline-multi-branch');
Tags.of(pipeline).add('Pipeline', `${repo}/${branch}`);
