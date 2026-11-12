import { S3Client } from "@aws-sdk/client-s3";

// R2 speaks the same language as Amazon S3, so the S3 library works.
// The two "WHEN_REQUIRED" lines stop newer SDK versions from adding extra
// checksum fields that break browser uploads to R2.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
