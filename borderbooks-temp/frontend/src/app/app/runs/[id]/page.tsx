import { RunWorkspace } from "@/components/run-workspace";
import { FileDown } from "lucide-react";
import { RunSettingsReplay } from "@/components/run-settings-replay";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><div style={{ padding: "16px 32px 0", textAlign: "right" }}><div className="head-actions" style={{ justifyContent: "flex-end" }}><a className="button secondary" href={`/api/match-runs/${id}/export.xlsx`}><FileDown size={15} /> Workpaper</a><a className="button secondary" href={`/api/match-runs/${id}/export.journals.csv`}><FileDown size={15} /> Journals</a></div><small className="subtle">Account labels are not accounting advice. Uploads are not used for model training.</small></div><div className="page" style={{paddingBottom:0}}><RunSettingsReplay runId={id}/></div><RunWorkspace /></>;
}
