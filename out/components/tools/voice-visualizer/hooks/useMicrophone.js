"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMicrophone = useMicrophone;
const react_1 = require("react");
function useMicrophone(options = {}) {
    const timesliceMs = options.timesliceMs ?? 2000;
    const [isRecording, setIsRecording] = (0, react_1.useState)(false);
    const [stream, setStream] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const recorderRef = (0, react_1.useRef)(null);
    const dataCbRef = (0, react_1.useRef)(null);
    const tickRef = (0, react_1.useRef)(null); // legacy cleanup (no active interval)
    const streamRef = (0, react_1.useRef)(null);
    const segTimerRef = (0, react_1.useRef)(null);
    const activeRef = (0, react_1.useRef)(false);
    const stop = (0, react_1.useCallback)(() => {
        activeRef.current = false;
        try {
            const rec = recorderRef.current;
            if (rec) {
                try {
                    // Flush the last chunk before stopping
                    if (rec.state === 'recording')
                        rec.requestData();
                }
                catch { }
                rec.stop();
            }
        }
        catch { }
        try {
            const s = streamRef.current;
            s?.getTracks().forEach((t) => t.stop());
        }
        catch { }
        recorderRef.current = null;
        if (tickRef.current) {
            window.clearInterval(tickRef.current);
            tickRef.current = null;
        }
        if (segTimerRef.current) {
            window.clearTimeout(segTimerRef.current);
            segTimerRef.current = null;
        }
        streamRef.current = null;
        setStream(null);
        setIsRecording(false);
    }, []);
    const start = (0, react_1.useCallback)(async () => {
        setError(null);
        try {
            const constraints = { audio: true, video: false };
            const s = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = s;
            setStream(s);
            const mimeCandidates = [
                options.mimeType,
                // Prefer WebM Opus first (most reliable chunking with MediaRecorder)
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/ogg',
                // MP4 last-resort fallback
                'audio/mp4;codecs=mp4a.40.2',
                'audio/mp4',
            ].filter(Boolean);
            const chosen = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t));
            const startNewSegment = () => {
                if (!activeRef.current)
                    return;
                const rec = new MediaRecorder(streamRef.current, chosen ? { mimeType: chosen } : undefined);
                rec.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        const cb = dataCbRef.current;
                        if (cb)
                            cb(e.data);
                    }
                };
                rec.onstop = () => {
                    if (!activeRef.current)
                        return;
                    // Start next segment
                    startNewSegment();
                };
                recorderRef.current = rec;
                rec.start();
                if (segTimerRef.current)
                    window.clearTimeout(segTimerRef.current);
                segTimerRef.current = window.setTimeout(() => {
                    try {
                        if (rec.state === 'recording')
                            rec.stop();
                    }
                    catch { }
                }, timesliceMs);
            };
            activeRef.current = true;
            startNewSegment();
            setIsRecording(true);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            setIsRecording(false);
        }
    }, [options.mimeType, timesliceMs]);
    (0, react_1.useEffect)(() => {
        return () => {
            activeRef.current = false;
            try {
                const rec = recorderRef.current;
                if (rec && rec.state === 'recording') {
                    try {
                        rec.requestData();
                    }
                    catch { }
                    try {
                        rec.stop();
                    }
                    catch { }
                }
            }
            catch { }
            try {
                const s = streamRef.current;
                s?.getTracks().forEach((t) => t.stop());
            }
            catch { }
            if (tickRef.current) {
                window.clearInterval(tickRef.current);
                tickRef.current = null;
            }
            if (segTimerRef.current) {
                window.clearTimeout(segTimerRef.current);
                segTimerRef.current = null;
            }
        };
    }, []);
    const onData = (0, react_1.useCallback)((cb) => {
        dataCbRef.current = cb;
        const rec = recorderRef.current;
        if (rec) {
            rec.ondataavailable = (e) => {
                if (e.data && e.data.size > 0)
                    cb(e.data);
            };
        }
    }, []);
    return { start, stop, isRecording, stream, recorder: recorderRef.current, error, onData };
}
