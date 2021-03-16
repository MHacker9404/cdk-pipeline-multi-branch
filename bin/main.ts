#!/usr/bin/env node
import { App, Tags } from '@aws-cdk/core';
import 'source-map-support/register';
import { SetupPipelineStack } from '../lib/SetupPipelineStack';

const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

const app = new App({ context: env });

new SetupPipelineStack(app, 'Setup-CodePipeline-Stack', {
    description: 'Lambda to generate CodePipelines',
});

Tags.of(app).add('App', 'pipeline-multi-branch');
