import { App, Stack, StackProps } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';

export class S3BucketStack extends Stack {
    constructor(app: App, id: string, props?: StackProps) {
        super(app, id, props);
        new Bucket(this, 'prb-cdk-s3');
    }
}
const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

const app = new App({ context: env });
new S3BucketStack(app, 's3Stack', { env });
