const { GraphQLServer } = require('graphql-yoga');

const typeDefs = `
    type Query {
        gnar: String
    }
`;

const resolvers = {
    Query: {
        gnar: () => 'gnarly!!!'
    }
};

const server = new GraphQLServer({ typeDefs, resolvers });

server.start(
    () => console.log('graph service running - http://localhost:4000')
);