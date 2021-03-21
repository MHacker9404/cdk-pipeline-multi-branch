import { StringParameter } from '@aws-cdk/aws-ssm';
import { App, Stack, StackProps, Tags } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import {
    CodeBuildAction,
    CodeBuildActionType,
    CodeCommitSourceAction,
    CodeCommitTrigger,
} from '@aws-cdk/aws-codepipeline-actions';
import { Repository } from '@aws-cdk/aws-codecommit';
import { Repository as EcrRepository } from '@aws-cdk/aws-ecr';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { BuildSpec, LinuxBuildImage, PipelineProject as CodeBuildProject } from '@aws-cdk/aws-codebuild';

interface CodePipelineStackProps extends StackProps {
    repo: string;
    branch: string;
}

export class CodePipelineStack extends Stack {
    constructor(app: App, id: string, props: CodePipelineStackProps) {
        super(app, id, props);

        //  necessary policies
        const secretsManagerReadAccess = ManagedPolicy.fromManagedPolicyName(
            this,
            'SecretsManagerReadAccess',
            'SecretsManagerReadAccess'
        );
        const codePipelineFullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AWSCodePipelineFullAccess',
            'arn:aws:iam::aws:policy/AWSCodePipelineFullAccess'
        );
        const codeCommitFullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AWSCodeCommitFullAccess',
            'arn:aws:iam::aws:policy/AWSCodeCommitFullAccess'
        );
        const codeBuildDevAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AWSCodeBuildDeveloperAccess',
            'arn:aws:iam::aws:policy/AWSCodeBuildDeveloperAccess'
        );
        const s3FullAccess = ManagedPolicy.fromManagedPolicyArn(
            this,
            'AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        );
        const codeCommitGitPullAccess = ManagedPolicy.fromManagedPolicyName(
            this,
            'CodeCommit_GitPull',
            'CodeCommit_GitPull'
        );

        const branch2 = props.branch.includes('/') ? props.branch.split('/')[1] : props.branch;

        //  necessary roles
        const codePipelineRole = new Role(this, `CodePipelineRole-${props.repo}-${branch2}`, {
            assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
            managedPolicies: [
                secretsManagerReadAccess,
                codePipelineFullAccess,
                codeCommitFullAccess,
                codeBuildDevAccess,
                s3FullAccess,
                codeCommitGitPullAccess,
            ],
        });
        const codebuildRole = new Role(this, `CodeBuild-${props.repo}-${branch2}`, {
            assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromManagedPolicyArn(
                    this,
                    'AdministratorAccess',
                    'arn:aws:iam::aws:policy/AdministratorAccess'
                ),
                codeCommitGitPullAccess,
            ],
        });

        const sourceRepo = Repository.fromRepositoryName(this, 'Source-Repository', props.repo);

        const buildImage = LinuxBuildImage.fromEcrRepository(
            EcrRepository.fromRepositoryName(this, 'CustomBuildImageRepository', 'custom-build-image')
        );

        const artifactBucket = new Bucket(this, `${repo}-${branch2}`);
        const pipeline = new Pipeline(this, 'Pipeline', {
            artifactBucket: artifactBucket,
            role: codePipelineRole,
            pipelineName: `${repo}-${branch2}`,
        });

        const sourceArtifact = new Artifact('source');
        const buildArtifact = new Artifact('build');
        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new CodeCommitSourceAction({
                    actionName: 'Source',
                    repository: sourceRepo,
                    branch: props.branch,
                    trigger: CodeCommitTrigger.EVENTS,
                    codeBuildCloneOutput: true,
                    output: sourceArtifact,
                }),
            ],
        });

        const integrationBuild = new CodeBuildProject(this, 'Integration-Project', {
            projectName: `integration-build-${repo}-${branch2}`,
            description: `integration-build-${repo}-${branch2}`,
            buildSpec: BuildSpec.fromSourceFilename('./buildspec/cont-integration.yaml'),
            role: codebuildRole,
            environment: {
                buildImage: buildImage,
                privileged: true,
            },
            checkSecretsInPlainTextEnvVariables: true,
        });
        pipeline.addStage({
            stageName: 'Integration',
            actions: [
                new CodeBuildAction({
                    actionName: 'ContIntegration',
                    input: sourceArtifact,
                    outputs: [buildArtifact],
                    project: integrationBuild,
                    type: CodeBuildActionType.BUILD,
                    checkSecretsInPlainTextEnvVariables: true,
                    executeBatchBuild: false,
                }),
            ],
        });

        //  TODO: instead of a CodeBuild PipelineProject - try CodeDeploy PipelineProject
        const deploymentBuild = new CodeBuildProject(this, 'Deployment-Project', {
            projectName: `deployment-build-${repo}-${branch2}`,
            description: `deployment-build-${repo}-${branch2}`,
            buildSpec: BuildSpec.fromSourceFilename('./buildspec/cont-deployment.yaml'),
            role: codebuildRole,
            environment: {
                buildImage: buildImage,
                privileged: true,
            },
            checkSecretsInPlainTextEnvVariables: true,
        });
        pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new CodeBuildAction({
                    actionName: 'ContDeployment',
                    input: buildArtifact,
                    project: deploymentBuild,
                    type: CodeBuildActionType.BUILD,
                    checkSecretsInPlainTextEnvVariables: true,
                    executeBatchBuild: false,
                }),
            ],
        });
    }
}

const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

const app = new App({ context: env });
const repo = app.node.tryGetContext('repo') || null;
const branch = app.node.tryGetContext('branch') || null;

const branch2 = branch.includes('/') ? branch.split('/')[1] : branch;

new CodePipelineStack(app, `Pipeline-${repo}-${branch2}`, {
    env,
    repo,
    branch,
});
Tags.of(app).add('Pipeline', `${repo}/${branch2}`);
app.synth();
