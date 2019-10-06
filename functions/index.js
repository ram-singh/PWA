var functions = require("firebase-functions");
var admin = require("firebase-admin");
var cors = require("cors");
var webpush = require("web-push");
var formidable = require("formidable");
var fs = require("fs");
var UUID = require("uuid-v4");
var os = require("os");
var Busboy = require("busboy");
var path = require('path');

const express = require('express');
const app = express();



// for parsing application/xwww-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// for parsing multipart/form-data
/*var multer = require('multer');
app.use(multer().array()); */

// for parsing application/json
app.use(express.json());
app.use(cors());
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-e2721-fb-key.json");
const PROJECT_ID = 'pwagram-e2721';
var gcconfig = {
  projectId: `${PROJECT_ID}`,
  keyFilename: "pwagram-e2721-fb-key.json"
};

var gcs = require("@google-cloud/storage")(gcconfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${PROJECT_ID}.firebaseio.com/`
});

exports.storePostData = functions.https.onRequest(function(request, response) {
  cors(request, response, function() {
    // export functions...
  });
});

app.post('/savePost', (request, response) => { 
  var uuid = UUID();
    const busboy = new Busboy({ headers: request.headers });
    // These objects will store the values (file + fields) extracted from busboy
    let upload;
    const fields = {};

    // This callback will be invoked for each file uploaded
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      console.log(
        `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
      );
      const filepath = path.join(os.tmpdir(), filename);
      upload = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    // This will invoked on every field detected
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      fields[fieldname] = val;
    });

    // This callback will be invoked after all uploaded files are saved.
    busboy.on("finish", () => {
      var bucket = gcs.bucket(`${PROJECT_ID}.appspot.com`);
      bucket.upload(
        upload.file,
        {
          uploadType: "media",
          metadata: {
            metadata: {
              contentType: upload.type,
              firebaseStorageDownloadTokens: uuid
            }
          }
        },
        function(err, uploadedFile) {
          if (!err) {
            admin.database().ref("posts").push({
                                                id: fields.id,
                                                title: fields.title,
                                                location: fields.location,
                                                rawLocation: {
                                                              lat: fields.rawLocationLat,
                                                              lng: fields.rawLocationLng
                                                            },
                                                image: "https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" +
                                                            encodeURIComponent(uploadedFile.name) +"?alt=media&token=" + uuid
              }).then(function() {
                return sendPushNotification(response);
              });
                    
          } else {
            return response.status(500).json({ error: err });
          }
        }
      );
    });
    busboy.end(request.rawBody);
});
app.post('/deletePost', (req, res) => {
  const key = req.body.key;
      console.log('deletePost:', key);
      admin.database().ref(`posts/${key}`).remove().then(function() {
        console.log("Post successfully deleted!");
        return res.status(201).json({ message: "Post successfully deleted!"});
      }).catch(function(error) {
          console.error("Error removing document: ", error);
          return res.status(500).json({ error: err });
      });
});

app.post('/directSavePost', (req, res) => {
      console.log('directSavePost:', req.body.id);
      admin.database().ref(`posts`).push({
                                            id: req.body.id,
                                            title: req.body.title,
                                            location: req.body.location,
                                            image: "XXX"
    }).then(function() {
        console.log("Post successfully saved directly in server");
        return sendPushNotification(res);
      }).catch(function(error) {
          console.error("Error in direct saving document: ", error);
          return res.status(500).json({ error: err });
      });
});
function sendPushNotification(response){
  webpush.setVapidDetails(  "mailto:ram.singh.akg@gmail.com",
                            "BKapuZ3XLgt9UZhuEkodCrtnfBo9Smo-w1YXCIH8YidjHOFAU6XHpEnXefbuYslZY9vtlEnOAmU7Mc-kWh4gfmE",
                            "AyVHwGh16Kfxrh5AU69E81nVWIKcUwR6a9f1X4zXT_s"
                          );
   return admin.database().ref("subscriptions").once("value")
        .then(function(subscriptions) {
                subscriptions.forEach(function(sub) {
                    var pushConfig = {
                      endpoint: sub.val().endpoint,
                      keys: {
                              auth: sub.val().keys.auth,
                              p256dh: sub.val().keys.p256dh
                            }
                    };
                    console.log('sending notifications...');
                    webpush.sendNotification(pushConfig, JSON.stringify({
                                                                          title: "New Post",
                                                                          content: "New Post added!",
                                                                          openUrl: "https://www.globallogic.com/"
                                                                        })
                    ).catch(function(err) {
                        return response.status(500).json({ error: err });
                    });
                });
                return response.status(201).json({ message: "Data stored", id: fields.id });
              }).catch(function(err) {
                return response.status(500).json({ error: err });
              });
}
// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(app);