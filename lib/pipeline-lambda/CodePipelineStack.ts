import { App, Stack, StackProps, Tags } from '@aws-cdk/core';

export class CodePipelineStack extends Stack {
    constructor(app: App, id: string, props?: StackProps) {
        super(app, id, props);
    }
}

const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

const app = new App({ context: env });
const repo = app.node.tryGetContext('repo') || null;
const branch = app.node.tryGetContext('branch') || null;

new CodePipelineStack(app, `Pipeline-${repo}-${branch}`, { env });
Tags.of(app).add('Pipeline', `${repo}/${branch}`);
app.synth();
