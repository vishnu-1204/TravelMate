import { retryFailedEmailsList } from "../services/email.service";
import { logger } from "./logger";

let recoveryInterval: NodeJS.Timeout | null = null;

/**
 * Starts the background process for retrying failed emails.
 * @param intervalMs How often to run the recovery (default 15 minutes)
 */
export const startEmailRecoveryTask = (intervalMs: number = 15 * 60 * 1000) => {
  if (recoveryInterval) {
    logger("[email/recovery] Task already running.");
    return;
  }

  logger(`[email/recovery] Starting background recovery task (Interval: ${intervalMs / 1000 / 60} mins)`);
  
  // Run immediately on start
  retryFailedEmailsList().catch(err => {
    logger(`[email/recovery] Initial run error: ${err.message}`);
  });

  recoveryInterval = setInterval(async () => {
    try {
      await retryFailedEmailsList();
    } catch (err: any) {
      logger(`[email/recovery] Background task error: ${err.message}`);
    }
  }, intervalMs);
};

export const stopEmailRecoveryTask = () => {
  if (recoveryInterval) {
    clearInterval(recoveryInterval);
    recoveryInterval = null;
    logger("[email/recovery] Background recovery task stopped.");
  }
};
