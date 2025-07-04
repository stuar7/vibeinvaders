/**
 * Low-priority, non-blocking worker log processor
 * Batches worker log messages and processes them during idle time
 */

class WorkerLogProcessor {
  constructor() {
    this.logQueue = [];
    this.batchSize = 10;  // Process 10 logs at a time
    this.flushInterval = 100; // Flush every 100ms
    this.maxQueueSize = 100; // Drop old logs if queue gets too large
    
    // Use requestIdleCallback for low-priority processing
    this.startIdleProcessing();
    
    // Fallback timer in case requestIdleCallback isn't available
    this.fallbackTimer = setInterval(() => {
      this.processBatch();
    }, this.flushInterval);
  }
  
  addLog(logData) {
    // Add timestamp if not present
    if (!logData.timestamp) {
      logData.timestamp = performance.now();
    }
    
    this.logQueue.push(logData);
    
    // Prevent memory leaks - drop old logs if queue gets too large
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize);
    }
  }
  
  startIdleProcessing() {
    if (typeof requestIdleCallback !== 'undefined') {
      const processWhenIdle = (deadline) => {
        // Process logs while we have idle time
        while (deadline.timeRemaining() > 1 && this.logQueue.length > 0) {
          this.processBatch(Math.min(5, this.batchSize)); // Smaller batches during idle
        }
        
        // Schedule next idle processing
        requestIdleCallback(processWhenIdle);
      };
      
      requestIdleCallback(processWhenIdle);
    }
  }
  
  processBatch(batchSize = this.batchSize) {
    if (this.logQueue.length === 0) return;
    
    const batch = this.logQueue.splice(0, batchSize);
    
    batch.forEach(logData => {
      this.outputLog(logData);
    });
  }
  
  outputLog(logData) {
    const { source, level, message, timestamp } = logData;
    const timeStr = (timestamp / 1000).toFixed(3);
    
    // Format: [WORKER:source @time] message
    const formattedMessage = `[WORKER:${source} @${timeStr}s] ${message}`;
    
    // Use appropriate console method based on level
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        // Only show debug in development
        if (process.env.NODE_ENV === 'development') {
          console.log(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }
  }
  
  flush() {
    // Process all remaining logs immediately
    while (this.logQueue.length > 0) {
      this.processBatch();
    }
  }
  
  dispose() {
    this.flush();
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }
  }
}

// Singleton instance
const workerLogProcessor = new WorkerLogProcessor();

export default workerLogProcessor;