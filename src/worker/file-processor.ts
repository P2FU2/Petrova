import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processUploadedFile } from "@/lib/file-processing";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL nao configurado para iniciar worker.");
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

new Worker(
  "file-processing",
  async (job) => {
    await processUploadedFile(job.data.context, job.data.fileId);
  },
  { connection }
);

// eslint-disable-next-line no-console
console.log("Worker de processamento de arquivos iniciado.");
