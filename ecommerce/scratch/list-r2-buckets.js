const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "auto",
  endpoint: "https://389127050a434f568c29dc66bdce2567.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "9dfcff79a85981b187e3b7bb8c09ed5d",
    secretAccessKey: "c57484a0e5857305950b9d4d15e68e58835c011aec6cfebcd8ec723a48108de6",
  },
});

async function run() {
  try {
    const data = await s3Client.send(new ListBucketsCommand({}));
    console.log("Buckets:", data.Buckets);
  } catch (err) {
    console.error("Error listing buckets:", err);
  }
}

run();
