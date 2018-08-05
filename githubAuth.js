const fetch = require('node-fetch');

const requestGithubToken = credentials =>
    fetch('https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        }
    ).then(res => res.json())
        .catch(error => {
            throw new Error(JSON.stringify(error))
        });

const requestGithubUserAccount = token =>
    fetch(`https://api.github.com/user?access_token=${token}`)
        .then(res => res.json())
        .catch(error => {
            throw new Error(JSON.stringify(error))
        });

async function authorizeWithGithub(credentials) {
    const { access_token } = await requestGithubToken(credentials);
    const githubUser = await requestGithubUserAccount(access_token);
    console.log(githubUser);
    return { ...githubUser, access_token };
}

async function githubAuth(root, { code }, { db }) {

    // 1. Obtain data from GitHub
    var {
        message,
        access_token,
        avatar_url,
        login,
        name
    } = await authorizeWithGithub({
        client_id: "98eb59faa218d6188c0b",
        client_secret: "03487d8522d6fb856216f132c497c6e04327a476",
        code
    });

    if (message) {
        throw new Error(message)
    }

    const user = {
        name,
        githubLogin: login,
        githubToken: access_token,
        avatar: avatar_url
    };

    const hasAccount = await db.collection('users').findOne({ githubLogin: login });

    if (hasAccount) {
        await db.collection('users').replaceOne({ githubLogin: login }, user);
    } else {
        await db.collection('users').insert(user)
    }

    return { user, token: access_token }
}

module.exports = githubAuth;