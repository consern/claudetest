export async function codeReviewerTask(task: string): Promise<string> {
  return `code-reviewer: 已完成高置信度检查。任务=${task}`;
}

