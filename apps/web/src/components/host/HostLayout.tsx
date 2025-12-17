import RoomCode from "../shared/RoomCode";
import ConnectionBadge from "../shared/ConnectionBadge";
import PhaseHeader from "../shared/PhaseHeader";

interface HostLayoutProps {
  roomCode: string;
  isConnected: boolean;
  phase: string;
  timer: number | null;
  children: React.ReactNode;
}

export default function HostLayout({
  roomCode,
  isConnected,
  phase,
  timer,
  children
}: HostLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <RoomCode code={roomCode} size="lg" />
          <ConnectionBadge isConnected={isConnected} />
        </div>

        {/* Phase Header with Timer */}
        <PhaseHeader phase={phase} timer={timer} />

        {/* Phase Content */}
        {children}
      </div>
    </div>
  );
}
