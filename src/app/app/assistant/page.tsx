import { getRepo } from "@/lib/repo";
import { PageHead } from "@/components/ui";
import { AssistantClient } from "./assistant-client";

export default async function AssistantPage() {
  const repo = await getRepo();
  const [jurisdictions, sources] = await Promise.all([repo.listJurisdictions(), repo.listSources()]);
  const approved = sources.filter((s) => s.status === "approved").length;
  return (
    <>
      <PageHead title="Regulatory document search" sub={`Answers drawn only from the ${approved} approved sources in your knowledge base, with citations and source dates.`} />
      <AssistantClient jurisdictions={jurisdictions.map((j) => ({ id: j.id, name: j.name, fictional: j.fictional }))} />
    </>
  );
}
