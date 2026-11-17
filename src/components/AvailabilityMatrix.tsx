import { ArrowUpRight } from "lucide-react";
import type { Branch, Preference } from "@/lib/types";

type Props = {
  branches: Branch[];
  selectedBranches: Preference[];
  onSelect: (branchId: string) => void;
};

export function BranchSelector({
  branches,
  selectedBranches,
  onSelect,
}: Props) {
  return (
    <div
      className="branch-selector"
      role="group"
      aria-label="Kies en rangschik je Branchvoorkeuren"
    >
      {branches.map((branch, index) => {
        const selectedIndex = selectedBranches.findIndex(
          (preference) => preference.branchId === branch.id,
        );
        const isSelected = selectedIndex !== -1;
        return (
          <button
            className={`branch-option${isSelected ? " is-selected" : ""}`}
            key={branch.id}
            type="button"
            onClick={() => onSelect(branch.id)}
            disabled={isSelected}
            aria-label={
              isSelected
                ? `${branch.name}, gekozen als voorkeur ${selectedIndex + 1}`
                : `${branch.name} toevoegen als voorkeur`
            }
            title={
              isSelected
                ? `Gekozen als voorkeur ${selectedIndex + 1}`
                : "Toevoegen als voorkeur"
            }
          >
            <span className="branch-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="branch-name">{branch.name}</span>
            <span className="branch-action">
              {isSelected ? (
                `Voorkeur ${selectedIndex + 1}`
              ) : (
                <ArrowUpRight size={15} aria-hidden="true" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
