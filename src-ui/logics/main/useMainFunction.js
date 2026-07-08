import { store } from "@store";

import {
    useStore_TranslationStatus,
    useStore_TranscriptionSendStatus,
    useStore_TranscriptionReceiveStatus,
    useStore_ForegroundStatus,
} from "@store";
import { useStdoutToPython } from "@useStdoutToPython";

const playMicSound = (isOn, type) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        
        let baseFreq = 440; // Default (Voice2Chatbox)
        if (type === "translation") baseFreq = 523.25; // Higher pitch for Translation
        if (type === "transcription_receive") baseFreq = 329.63; // Lower pitch for Speaker2Log

        if (isOn) {
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.setValueAtTime(baseFreq * 1.36, now + 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
        } else {
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.setValueAtTime(baseFreq * 0.68, now + 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
        }
        osc.start(now);
        osc.stop(now + 0.2);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export const useMainFunction = () => {
    const appWindow = store.appWindow;

    const {
        currentTranslationStatus,
        updateTranslationStatus,
        pendingTranslationStatus,
    } = useStore_TranslationStatus();
    const {
        currentTranscriptionSendStatus,
        updateTranscriptionSendStatus,
        pendingTranscriptionSendStatus,
    } = useStore_TranscriptionSendStatus();
    const {
        currentTranscriptionReceiveStatus,
        updateTranscriptionReceiveStatus,
        pendingTranscriptionReceiveStatus,
    } = useStore_TranscriptionReceiveStatus();
    const {
        currentForegroundStatus,
        updateForegroundStatus,
    } = useStore_ForegroundStatus();

    const { asyncStdoutToPython } = useStdoutToPython();

    const createTogglePair = (pendingFn, updateFn, endpointName) => {
        const setFn = (to_enable) => {
            pendingFn();
            if (endpointName !== "translation") {
                playMicSound(to_enable, endpointName);
            }
            if (to_enable) {
                asyncStdoutToPython(`/set/enable/${endpointName}`);
            } else {
                asyncStdoutToPython(`/set/disable/${endpointName}`);
            }
        };
        const toggleFn = () => {
            updateFn(prev_state => {
                if (prev_state.state === "ok") setFn(!prev_state.data);
            }, { set_state: "pending" });
        };
        return { setFn, toggleFn };
    };

    const { setFn: setTranslation, toggleFn: toggleTranslation } = createTogglePair(
        pendingTranslationStatus, updateTranslationStatus, "translation"
    );
    const { setFn: setTranscriptionSend, toggleFn: toggleTranscriptionSend } = createTogglePair(
        pendingTranscriptionSendStatus, updateTranscriptionSendStatus, "transcription_send"
    );
    const { setFn: setTranscriptionReceive, toggleFn: toggleTranscriptionReceive } = createTogglePair(
        pendingTranscriptionReceiveStatus, updateTranscriptionReceiveStatus, "transcription_receive"
    );


    const toggleForeground = async () => {
        const is_foreground_enabled = !currentForegroundStatus.data;
        await appWindow.setAlwaysOnTop(is_foreground_enabled);
        updateForegroundStatus(is_foreground_enabled);
    };

    return {
        currentTranslationStatus,
        toggleTranslation,
        updateTranslationStatus,
        setTranslation,
        pendingTranslationStatus, // Exception.(It shouldn't be used in other function, normally.)

        currentTranscriptionSendStatus,
        toggleTranscriptionSend,
        updateTranscriptionSendStatus,
        setTranscriptionSend,
        pendingTranscriptionSendStatus, // Exception.(It shouldn't be used in other function, normally.)

        currentTranscriptionReceiveStatus,
        toggleTranscriptionReceive,
        updateTranscriptionReceiveStatus,
        setTranscriptionReceive,
        pendingTranscriptionReceiveStatus, // Exception.(It shouldn't be used in other function, normally.)

        currentForegroundStatus,
        toggleForeground,
        updateForegroundStatus,

    };
};