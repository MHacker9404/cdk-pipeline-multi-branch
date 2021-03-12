# CDK CodePipeline Multi-Branch strategy

The purpose is to re-architect the [codepipeline muulti-branch strategy](https://github.com/aws-samples/aws-codepipeline-multi-branch-strategy) example. The issue it raised with me is the dependecy on CloudFormation executed from a Lambda - and I don't like CloudFormation.

I used [cdk-in-lambda](https://github.com/imyoungyang/cdk-in-lambda) as a starting point.

## Assumptions

AWS CLI Keys are stored in secrets: dev/aws_access_key_id and dev/aws_secret_access_key
