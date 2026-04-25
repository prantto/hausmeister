// Thin wrapper around livekit-client. Joins a room, publishes the mic,
// auto-plays remote audio tracks (the Hausmeister agent), and exposes
// transcript events from the agent's data channel.

import { Room, RoomEvent, Track, createLocalAudioTrack } from "livekit-client";

export async function connectAndPublish({ url, token, onTranscript, onState }) {
  const room = new Room({ adaptiveStream: true, dynacast: true });

  // Auto-attach any remote audio track (the agent) to a hidden <audio>.
  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) {
      const el = track.attach();
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
  });

  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    onState?.(state);
  });

  // Agent transcripts come through as DataPackets — payload is JSON.
  room.on(RoomEvent.DataReceived, (payload) => {
    try {
      const text = new TextDecoder().decode(payload);
      const msg = JSON.parse(text);
      onTranscript?.(msg);
    } catch {}
  });

  await room.connect(url, token);
  const mic = await createLocalAudioTrack({
    echoCancellation: true,
    noiseSuppression: true,  // browser-side; ai-coustics adds a 2nd pass server-side.
    autoGainControl: true,
  });
  await room.localParticipant.publishTrack(mic);

  return {
    room,
    micTrack: mic,
    async leave() {
      try { mic.stop(); } catch {}
      await room.disconnect();
      // Remove any audio elements we spawned.
      document
        .querySelectorAll('audio[data-livekit-track]')
        .forEach((el) => el.remove());
    },
    setMicEnabled(on) {
      mic.mediaStreamTrack.enabled = on;
    },
  };
}
