export interface ExtractedMessageContent {
  type: string;
  text: string;
  mediaId?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaCaption?: string;
  replyToWamid?: string;
  errorCode?: string;
  failureReason?: string;
  rawPayload?: Record<string, unknown>;
}
