#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LambdaStack } from '../lib/lambda-s3/LambdaStack';

const app = new cdk.App();
new LambdaStack(app, 'LambdaStack');
