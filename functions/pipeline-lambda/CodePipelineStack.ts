import { App, Stack, StackProps } from '@aws-cdk/core';

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
new CodePipelineStack(app, 'CodePipelineStack', { env });
