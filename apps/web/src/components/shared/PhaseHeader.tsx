import { getPhaseName } from "../../lib/formatters";
import Timer from "./Timer";

interface PhaseHeaderProps {
  phase: string;
  timer?: number | null;
  showTimer?: boolean;
}

export default function PhaseHeader({ phase, timer, showTimer = true }: PhaseHeaderProps) {
  return (
    <div className="bg-gray-800 text-white rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">
          {getPhaseName(phase)}
        </h2>
        {showTimer && timer !== null && timer !== undefined && (
          <Timer seconds={timer} size="lg" />
        )}
      </div>
    </div>
  );
}
