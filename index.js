const { GraphQLServer } = require('graphql-yoga');
const { MongoClient } = require('mongodb');

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

    type Query {
        totalPhotos: Int!
        allPhotos: [Photo!]!
        totalUsers: Int!
        allUsers: [User!]!
    }

    type Mutation {
        postPhoto(name: String! description: String): Photo!
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
            ctx.db.collection('users').find().find().toArray()
    },

    Mutation: {
        postPhoto(parent, args, ctx) {
            const newPhoto = {
                id: _id++,
                ...args
            };
            ctx.db.insert(newPhoto);
            return newPhoto
        }
    }
};


async function start() {

    const MONGO_DB = 'mongodb://localhost:27017/graphql-photos';
    const client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true });
    const db = client.db();

    const context = {db};

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