import { EventEmitter } from "events";

class SubmissionEmitter extends EventEmitter {}

export const submissionEmitter = new SubmissionEmitter();