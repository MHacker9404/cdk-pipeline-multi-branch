import 'source-map-support/register';
import { SecretsManager, STS } from 'aws-sdk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { exec } from 'child_process';
// import '../../lib/lambda/S3BucketStack';

const default_region = process.env.AWS_REGION || 'us-east-1';
let aws_access_key_id: string, aws_secret_access_key: string;

const configEnv = async () => {
    if (!fs.pathExistsSync(path.resolve('/tmp', '.aws', 'config'))) {
        const data = `
[profile default]
output = json
region = ${default_region}
      `;
        fs.outputFileSync(path.resolve('/tmp', '.aws', 'config'), data);
    }

    const secretsManager = new SecretsManager();
    const accessKeyParam = {
        SecretId: `dev/aws_access_key_id`,
    };
    aws_access_key_id = JSON.parse((await secretsManager.getSecretValue(accessKeyParam).promise()).SecretString || 'null')
        .aws_access_key_id;

    const accessSecretKeyParam = {
        SecretId: `dev/aws_secret_access_key`,
    };
    aws_secret_access_key = JSON.parse(
        (await secretsManager.getSecretValue(accessSecretKeyParam).promise()).SecretString || 'null'
    ).aws_secret_access_key;
    if (!fs.pathExistsSync(path.resolve('/tmp', '.aws', 'credentials'))) {
        const data = `
[default]
aws_access_key_id=${aws_access_key_id}
aws_secret_access_key=${aws_secret_access_key}
      `;
        fs.outputFileSync(path.resolve('/tmp', '.aws', 'credentials'), data);
    }
};

async function configCDK() {
    if (!fs.pathExistsSync(path.resolve('/tmp', '.cdk.json'))) {
        const sts = new STS();
        let account: string;

        sts.getCallerIdentity({}, (error, data) => {
            if (error) {
                console.log('Error', error);
            } else {
                account = data.Account!;
            }
        });

        const data = `
{        
    "app": "node ./index.js",
    "output": "/tmp/cdk.out",
    "env": {
        "account": "${account}",
        "region": "us-east-1"
    },
    "context": {
        "@aws-cdk/core:enableStackNameDuplicates": "true",
        "aws-cdk:enableDiffNoFail": "true",
        "@aws-cdk/core:stackRelativeExports": "true",
        "@aws-cdk/aws-ecr-assets:dockerIgnoreSupport": true,
        "@aws-cdk/aws-secretsmanager:parseOwnedSecretName": true,
        "@aws-cdk/aws-kms:defaultKeyPolicies": true,
        "@aws-cdk/aws-s3:grantWriteWithoutAcl": true,
        "@aws-cdk/core:newStyleStackSynthesis": "true"
    }
}
      `;
        fs.outputFileSync(path.resolve('/tmp', '.cdk.json'), data);
    }
}

/*
 * Handle the chile process and returns a Promise
 * that resoved when process finishes executing
 *
 * The Promise resolves an  exit_code
 */
function handleProcess(process: any): Promise<any> {
    return new Promise((resolve, reject) => {
        process.stdout.on('data', (data: any) => {
            console.log(`stdout: ${data}`);
            console.log('stdout');
        });

        process.stderr.on('data', (data: any) => {
            console.log(`stderr: ${data}`);
        });

        process.on('close', (code: any) => {
            console.log(`child process exited with code ${code}`);
            if (code === 0) {
                resolve(code);
            } else {
                reject(code);
            }
        });
    });
}

export const handler = async (event: any = {}, context: any, callback: any): Promise<any> => {
    await configEnv();
    await configCDK();

    console.log(event);
    console.log(process);

    const cmd = `
    export HOME='/tmp'
    printenv
    pwd
    ls -al
    ls -al /tmp
    cat /tmp/.cdk.json
      `;
    // npx cdk deploy -v --profile default --region ${default_region} --requireApproval=never

    return handleProcess(exec(cmd))
        .then(exit_code => {
            console.log(`exit_code = ${exit_code}`);
            let response = {
                statusCode: 0 == exit_code ? 200 : 500,
                body: exit_code,
            };
            callback(null, response);
        })
        .catch(error => {
            console.error(error);
            let response = {
                statusCode: 500,
                body: error,
            };
            callback(null, response);
        });
};
