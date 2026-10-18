// Consumes the extraction SQS queue. Messages are enqueued when a reviewer uploads a new
// official source (S3 `sources/` prefix → ingestion → queue). Sections are produced by the
// ingestion step (Amazon Textract for PDFs, HTML-to-text for web pages) before this runs.
import type { SQSHandler } from "aws-lambda";
import { getRepo } from "../src/lib/repo/index.ts";
import { extractRequirements } from "../src/lib/ai/extraction.ts";

export const handler: SQSHandler = async (event) => {
  const repo = await getRepo();
  const [sources, permitTypes] = await Promise.all([repo.listSources(), repo.listPermitTypes()]);
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const { sourceId, requestedBy } = JSON.parse(record.body) as { sourceId: string; requestedBy: string };
      const source = sources.find((s) => s.id === sourceId);
      if (!source) throw new Error(`unknown source ${sourceId}`);
      if (source.sections.length === 0) throw new Error(`source ${sourceId} has no indexed sections yet`);
      const result = await extractRequirements(source);
      const pt = permitTypes.find((p) => p.sourceIds.includes(source.id) || (source.supersedesId && p.sourceIds.includes(source.supersedesId)));
      await repo.saveExtractionRun(
        {
          id: `ex-${record.messageId.slice(0, 8)}`,
          sourceId,
          permitTypeId: pt?.id,
          createdAt: new Date().toISOString(),
          createdBy: requestedBy ?? "system:extraction-worker",
          method: result.method,
          status: "pending_review",
          items: result.items,
        },
        "system:extraction-worker",
      );
    } catch (e) {
      console.error(JSON.stringify({ job: "extraction-worker", messageId: record.messageId, error: (e as Error).message }));
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
};
