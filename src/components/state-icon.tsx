import type { ItemResult } from "@/lib/engine/completeness";
import { IconAlert, IconCheck, IconMinus, IconQuestion, IconX } from "./icons";

export const STATE_LABEL: Record<ItemResult["state"], string> = {
  satisfied: "Satisfied",
  issue: "Needs attention",
  missing: "Missing",
  conditional_open: "Applicability not decided",
  not_applicable: "Not applicable",
};

export const STATE_BADGE: Record<ItemResult["state"], string> = {
  satisfied: "b-green",
  missing: "b-red",
  issue: "b-amber",
  conditional_open: "b-gray",
  not_applicable: "b-gray",
};

export function StateIcon({ state }: { state: ItemResult["state"] }) {
  const icon = { satisfied: <IconCheck />, missing: <IconX />, issue: <IconAlert />, conditional_open: <IconQuestion />, not_applicable: <IconMinus /> }[state];
  return <span className={`req-icon st-${state}`} aria-label={STATE_LABEL[state]}>{icon}</span>;
}
