import { Queue } from "bullmq";
import IORedis from "ioredis";
import { processUploadedFile } from "@/lib/file-processing";
import type { AuthContext } from "@/lib/auth";

export interface FileProcessingJob {
  fileId: string;
  context: AuthContext;
}

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new IORedis(redisUrl, { maxRetriesPerRequest: null }) : null;
export const fileQueue = redis ? new Queue<FileProcessingJob>("file-processing", { connection: redis }) : null;

export async function enqueueFileProcessing(job: FileProcessingJob) {
  if (!fileQueue) {
    return processUploadedFile(job.context, job.fileId);
  }
  await fileQueue.add("parse-file", job, { attempts: 3, backoff: { type: "fixed", delay: 2000 } });
  return { queued: true };
}
