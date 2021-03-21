module.exports = {
    branches: [
        'trunk',
        {
            name: 'release/[0-9]*',
            prerelease: 'beta',
        },
        {
            name: 'dev',
            prerelease: 'alpha',
        },
        {
            name: 'feature/\\w*',
            prerelease: '${name.replace(/^feature\\//g, "")}',
        },
        {
            name: 'fix/\\w*',
            prerelease: '${name.replace(/^fix\\//g, "")}',
        },
    ],
    prepare: [
        '@semantic-release/changelog',
        {
            path: '@semantic-release/git',
            // assets: ['package.json', 'yarn.lock', 'CHANGELOG.md'],
            assets: ['CHANGELOG.md'],
            message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
        },
    ],
    plugins: [
        [
            '@semantic-release/commit-analyzer',
            {
                releaseRules: [
                    { type: 'feat', scope: '*', release: 'minor' },
                    { type: 'perf', release: 'minor' },
                    { type: 'build', scope: '*', release: 'patch' },
                    //     { type: 'ci', release: 'patch' },
                    // { type: 'chore', release: 'patch' },
                    { type: 'refactor', release: 'patch' },
                    { type: 'style', release: 'patch' },
                    { type: 'WIP', scope: '*', release: 'patch' },
                ],
                parserOpts: {
                    noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
                },
            },
        ],
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
        '@semantic-release/git',
        [
            '@semantic-release/exec',
            {
                /** learned my lesson */
                publishCmd: 'pwsh ./buildspec/integration-release.ps1 ${envCi.branch} ${nextRelease.version}',
            },
        ],
    ],
};
