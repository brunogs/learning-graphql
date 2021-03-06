const { GraphQLServer } = require('graphql-yoga');
const { MongoClient } = require('mongodb');
const githubAuth = require('./githubAuth');
const postPhoto = require('./postPhoto');

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
    
    input PostPhotoInput {
        name: String!
        description: String
    }

    type Mutation {
        postPhoto(input: PostPhotoInput!): Photo!
        githubAuth(code: String!): AuthPayload!
    }

`;

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
    Photo: {
        id: parent => parent.id || parent._id,
        url: parent => `/img/photos/${parent._id}.jpg`,
        postedBy: (parent, args, { db }) =>
            db.collection('users').findOne({ githubLogin: parent.userID })
    },

    Mutation: {
        postPhoto: postPhoto,
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