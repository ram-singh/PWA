const firebaseDB = 'https://pwagram-e2721.firebaseio.com';
const firebaseFunction = 'https://us-central1-pwagram-e2721.cloudfunctions.net';
var API = {
    getPosts: firebaseDB+'/posts.json',
    saveSubscription: firebaseDB+'/subscriptions.json',
    savePost: firebaseFunction+'/api/savePost',
    deletePost: firebaseFunction+'/api/deletePost',
    directSavePost: firebaseFunction+'/api/directSavePost'
};