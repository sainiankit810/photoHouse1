let express = require('express');
let app = express();
require('dotenv').config();
const port = 3002;
let multer = require('multer')
let multerS3 = require('multer-s3')
let axios = require('axios').default
let client = require('./redis')

let AWS = require('aws-sdk');
const s3 = new AWS.S3();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

let myBucket = process.env.AWS_BUCKET_NAME;

let upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: myBucket,
        acl: "public-read",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            cb(null, file.originalname);
        }
    })
});

// To upload the multiple files
app.post("/uploads", upload.array("images", 100), (req, res, next)=>{
    res.json({ message: `Successfully uploaded ${req.files.length} files` });
});

// To get the all files from the s3 bucket
app.get("/album", async (req, res, next) => {
        const baseURL = `https://photohousebucket.s3.ap-southeast-2.amazonaws.com/`
        const cacheValue = await client.get('cachedData');
        if (cacheValue) {
          console.log('Data fetched from cache');
          const urlArr = JSON.parse(cacheValue).Contents.map(e => baseURL + e.Key);
          return res.json(urlArr);
        }
    s3.listObjects({Bucket: myBucket})
    .promise()
    .then(data => {
        console.log(data)
        let urlArr = data.Contents.map(e => baseURL + e.Key);
        client.set('cachedData', JSON.stringify(data));
        console.log('Data fetched from API and cached');
        res.json(urlArr)
    })
    .catch(err => console.log(err));
})


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})

