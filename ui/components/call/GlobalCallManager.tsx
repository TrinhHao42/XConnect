"use client";

import { useWebRTC } from "@/hooks/useWebRTC";
import CallOverlay from "./CallOverlay";
import IncomingCallModal from "./IncomingCallModal";

export default function GlobalCallManager() {
  // Mounts the socket listeners and handles the beforeunload hook
  useWebRTC();

  return (
    <>
      <IncomingCallModal />
      <CallOverlay />
    </>
  );
}
