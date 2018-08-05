const { GraphQLServer } = require('graphql-yoga');
const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

const port = 4000;
const typeDefs = `
    type Photo {
        id: ID!
        url: String!
        name: String!
        description: String,
        postedBy: User!
        taggedUsers: [User!]!
    }
    
    type User {
        githubLogin: ID!
        name: String
        avatar: String
        postedPhotos: [Photo!]!
        inPhotos: [Photo!]!
    }
    
    type AuthPayload {
      token: String!
      user: User!
    }

    type Query {
        totalPhotos: Int!
        allPhotos: [Photo!]!
        totalUsers: Int!
        allUsers: [User!]!
        me: User
    }

    type Mutation {
        postPhoto(name: String! description: String): Photo!
        githubAuth(code: String!): AuthPayload!
    }

`;

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
};

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

    // 2. If there is a message, something went wrong
    if (message) {
        throw new Error(message)
    }

    // 3. Package the results in a single object
    var user = {
        name,
        githubLogin: login,
        githubToken: access_token,
        avatar: avatar_url
    };

    // 4. See if the account exists
    var hasAccount = await db.collection('users').findOne({ githubLogin: login });

    if (hasAccount) {

        // 5. If so, update the record with the latest info
        await db.collection('users').replaceOne({ githubLogin: login }, user);

    } else {

        // 6. If not, add the user
        await db.collection('users').insert(user)

    }

    // 7. Return user data and their token
    return { user, token: access_token }

}

const resolvers = {
    Query: {
        totalPhotos: (parent, args, ctx) =>
            ctx.db.collection('photos').count(),

        allPhotos: (parent, args, ctx) =>
            ctx.db.collection('photos').find().toArray(),

        totalUsers: (parent, args, ctx) =>
            ctx.db.collection('users').find().count(),

        allUsers: (parent, args, ctx) =>
            ctx.db.collection('users').find().find().toArray(),

        me: (parent, args, ctx) => ctx.user
    },

    Mutation: {
        postPhoto(parent, args, ctx) {
            const newPhoto = {
                id: _id++,
                ...args
            };
            ctx.db.insert(newPhoto);
            return newPhoto
        },
        githubAuth: githubAuth
    }
};


async function start() {

    const MONGO_DB = 'mongodb://localhost:27017/graphql-photos';
    const client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true });
    const db = client.db();

    const context = async ({ request }) => {
        var auth = request.headers.authorization;
        var githubToken = auth && auth.replace('bearer ', '');
        var user = await db.collection('users').findOne({ githubToken: githubToken });

        console.log(user);
        return { db, user }
    };

    const server = new GraphQLServer({ typeDefs, resolvers, context });

    server.express.get('/', (req, res) => {
        res.end(`The PhotoShare Service - http://localhost:${port}/playground`);
    });

    server.start(
        { port, endpoint: '/graphql', playground: '/playground' },
        ({ port }) => console.log(`graph service running - http://localhost:${port}`)
    );
}

start();