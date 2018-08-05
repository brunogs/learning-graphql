
async function postPhoto(root, args, { db, user }) {

    if (!user) {
        throw new Error('only an authorized user can post a photo');
    }

    const newPhoto = {
        ...args.input,
        userID: user.githubLogin,
        created: new Date()
    };

    const { insertedIds } = await db.collection('photos').insert(newPhoto);
    newPhoto.id = insertedIds[0];
    return newPhoto;
}

module.exports = postPhoto;