---
description: 'API-Referenz für Voice Transcription (Whisper) inklusive Streaming'
owner: 'Voice Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/pages/api/voice/**, src/lib/services/voice-transcribe-service.ts, docs/api/voice_api.md'
---

<!-- markdownlint-disable MD051 -->

# Voice & Transcription API

**Status:** ✅ Vollständig implementiert (Production-Ready)
**Dokumentationsstatus:** 🔄 Wird aktualisiert

Die Voice API bietet Real-time Audio-Transkription mit OpenAI Whisper. Unterstützt Streaming-Verarbeitung, Mehrsprachigkeit und Live-Updates über Server-Sent Events (SSE) und Polling.

## Übersicht

- **Basis-URL:** `/api/voice`

- **Authentifizierung:** Optional (User + Guest-Modus)

- **AI-Provider:** OpenAI Whisper (via API)

- **Audio-Format:** WebM, MP3, WAV, FLAC, M4A

- **Real-time:** Server-Sent Events + Polling

- **Sprachen:** 50+ Sprachen (automatische Erkennung)

- **Limits:** Plan-basierte Nutzungsgrenzen

## Architektur

### Real-time Transkriptions-Pipeline

```mermaid
graph TB
    A[Audio Recording] --> B[Chunked Upload]
    B --> C[POST /api/voice/transcribe]
    C --> D[Whisper Processing]
    D --> E[KV Storage]
    E --> F[GET /api/voice/stream]
    F --> G[Real-time Updates]
    G --> H[Final Transcript]

```text

### Session-Management

```mermaid
stateDiagram-v2
    [*] --> session_created
    session_created --> chunk_processing
    chunk_processing --> partial_results
    partial_results --> more_chunks
    more_chunks --> chunk_processing
    more_chunks --> final_result
    final_result --> session_complete
    session_complete --> [*]
```

## Endpunkte

### POST `/api/voice/transcribe`

Verarbeitet Audio-Chunks für Real-time Transkription.

#### Request Format

**Content-Type:** `multipart/form-data`

**Erforderliche Felder:**

- `chunk` - Audio-Chunk (WebM, MP3, WAV, FLAC, M4A)

- `sessionId` - Eindeutige Session-ID

**Optionale Felder:**

- `lang` - Zielsprache (ISO-Code, z.B. `de`, `en`)

- `jobId` - Job-ID für Fortsetzung

- `isLastChunk` - Letzter Chunk (`true`/`false`)

#### Beispiel-Request

```bash
curl -X POST "http://127.0.0.1:8787/api/voice/transcribe" \
  -H "X-CSRF-Token: abc123" \
  -H "Cookie: csrf_token=abc123" \
  -H "Origin: http://127.0.0.1:8787" \
  -F "chunk=@audio.webm;type=audio/webm" \
  -F "sessionId=session_abc123" \
  -F "lang=de" \
  -F "isLastChunk=false"

```text

Hinweis: Der kanonische Multipart‑Request ist in der OpenAPI‑Spezifikation als Komponente definiert:
`#/components/schemas/VoiceTranscribeRequest`. Serverseitig werden die Felder per Zod validiert
(`sessionId` Pflicht, `jobId`/`lang`/`isLastChunk` optional; `chunk` binär erforderlich).

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "jobId": "job_def456",
    "text": "Hallo, das ist ein Test für die Transkription.",
    "isFinal": false,
    "usage": {
      "used": 1,
      "limit": 10,
      "resetAt": null
    },
    "limits": {
      "user": 50,
      "guest": 5
    }
  }
}
```

#### Error Responses

**Audio-Format ungültig (400):**

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Unsupported audio format"
  }
}

```text

**Quota überschritten (403):**

```json
{
  "success": false,
  "error": {
    "type": "forbidden",
    "message": "Tägliches Transkriptionslimit erreicht",
    "details": {
      "used": 5,
      "limit": 5,
      "resetAt": "2025-01-16T00:00:00.000Z"
    }
  }
}
```

### GET `/api/voice/stream`

Server-Sent Events für Real-time Transkriptionsergebnisse.

#### Query-Parameter

- `jobId` (erforderlich): Job-ID aus Transkriptions-Request

- `sessionId` (erforderlich): Session-ID

#### Beispiel-Request (2)

```bash
curl "http://127.0.0.1:8787/api/voice/stream?jobId=job_def456&sessionId=session_abc123"

```text

#### SSE Events

**Text-Update:**

```text
event: transcript
data: {
  "text": "Hallo, das ist ein Test",
  "isFinal": false,
  "confidence": 0.95
}
```

**Finales Ergebnis:**

```text
event: final
data: {
  "text": "Hallo, das ist ein Test für die Transkription.",
  "isFinal": true,
  "language": "de",
  "duration": 5.2
}

```text

**Fehler:**

```text
event: error
data: {
  "type": "processing_error",
  "message": "Audio processing failed"
}
```

### GET `/api/voice/poll`

Polling-Alternative zu SSE für Transkriptionsergebnisse.

#### Query-Parameter (2)

- `jobId` (erforderlich): Job-ID

- `lastUpdate` (optional): Timestamp der letzten Aktualisierung

#### Beispiel-Request (3)

```bash
curl "http://127.0.0.1:8787/api/voice/poll?jobId=job_def456&lastUpdate=1705312200000"

```text

#### Success Response (200) (2)

```json
{
  "success": true,
  "data": {
    "jobId": "job_def456",
    "status": "processing",
    "text": "Hallo, das ist ein Test",
    "isFinal": false,
    "progress": 0.75,
    "estimatedTimeRemaining": 2.1
  }
}
```

### GET `/api/voice/usage`

Ruft die aktuellen Voice-Nutzungsstatistiken ab.

#### Beispiel-Request (4)

```bash
curl "http://127.0.0.1:8787/api/voice/usage" \
  -H "Cookie: guest_id=abc123"

```text

#### Success Response (200) (3)

```json
{
  "success": true,
  "data": {
    "ownerType": "guest",
    "usage": {
      "used": 2,
      "limit": 5,
      "resetAt": null
    },
    "limits": {
      "user": 50,
      "guest": 5
    }
  }
}
```

## Audio-Anforderungen

### Unterstützte Formate

| Format | Codec | Max. Größe | Max. Dauer |
|--------|-------|------------|------------|
| **WebM** | Opus | 25MB | 30 Minuten |
| **MP3** | MP3 | 25MB | 30 Minuten |
| **WAV** | PCM | 25MB | 15 Minuten |
| **FLAC** | FLAC | 25MB | 20 Minuten |
| **M4A** | AAC | 25MB | 25 Minuten |

### Optimale Audio-Parameter

**Empfohlene Einstellungen:**

- **Sample-Rate:** 16kHz (für Sprache optimal)

- **Bitrate:** 64-128 kbps

- **Kanäle:** Mono (für bessere Performance)

- **Format:** WebM mit Opus-Codec

**Beispiel-Client-Konfiguration:**

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  }
});

```text

## Sprachunterstützung

### Automatische Spracherkennung

**Unterstützte Sprachen:**

- **Deutsch** (de)

- **Englisch** (en)

- **Französisch** (fr)

- **Spanisch** (es)

- **Italienisch** (it)

- **Portugiesisch** (pt)

- **Niederländisch** (nl)

- **50+ weitere Sprachen**

**Spracherkennung:**

- Automatische Erkennung ohne Sprach-Code

- Explizite Sprachauswahl für bessere Genauigkeit

- Fallback auf Englisch bei unbekannter Sprache

### Genauigkeit pro Sprache

| Sprache | Whisper-Genauigkeit | Optimale Dauer |
|---------|-------------------|---------------|
| **Deutsch** | 95%+ | 5-15 Sekunden |
| **Englisch** | 97%+ | 5-20 Sekunden |
| **Französisch** | 94%+ | 5-15 Sekunden |
| **Spanisch** | 96%+ | 5-15 Sekunden |

## Real-time Features

### Chunked Processing

**Audio-Chunking:**

- **Chunk-Größe:** 1-5 Sekunden Audio

- **Overlap:** 250ms für bessere Genauigkeit

- **Buffer:** 10 Sekunden Audio-Cache

- **Streaming:** Echtzeit-Verarbeitung

**Client-Implementierung:**

```javascript
const CHUNK_DURATION = 2000; // 2 Sekunden
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});

mediaRecorder.ondataavailable = async (event) => {
  const formData = new FormData();
  formData.append('chunk', event.data);
  formData.append('sessionId', sessionId);
  formData.append('isLastChunk', 'false');

  await fetch('/api/voice/transcribe', {
    method: 'POST',
    body: formData
  });
};
```

### Live-Updates

**Server-Sent Events:**

```javascript
const eventSource = new EventSource('/api/voice/stream?jobId=' + jobId);

eventSource.addEventListener('transcript', (event) => {
  const data = JSON.parse(event.data);
  updateTranscript(data.text, data.isFinal);
});

eventSource.addEventListener('final', (event) => {
  const data = JSON.parse(event.data);
  finalizeTranscript(data.text);
  eventSource.close();
});

```text

**Polling-Alternative:**

```javascript
async function pollForUpdates(jobId, lastUpdate = 0) {
  const response = await fetch(`/api/voice/poll?jobId=${jobId}&lastUpdate=${lastUpdate}`);
  const data = await response.json();

  if (data.success) {
    updateTranscript(data.data.text, data.data.isFinal);

    if (!data.data.isFinal) {
      setTimeout(() => pollForUpdates(jobId, Date.now()), 1000);
    }
  }
}
```

## Sicherheit

### Audio-Sicherheit

**Input-Validierung:**

- **Format-Prüfung:** Nur erlaubte Audio-Formate

- **Größen-Limit:** Max. 25MB pro Chunk

- **Dauer-Limit:** Max. 30 Minuten Gesamtdauer

- **Content-Type:** Korrekte MIME-Type Validierung

**Rate-Limiting:**

- **Transkription:** 10/min für alle Benutzer

- **Session-Erstellung:** 5/min pro User

- **Audio-Upload:** 50MB/min pro User

### Datenschutz

**Audio-Handling:**

- **Temporäre Speicherung:** Audio wird nur während der Verarbeitung gespeichert

- **Automatische Löschung:** Audio-Daten werden nach 1 Stunde gelöscht

- **Keine Persistierung:** Transkripte werden nicht mit Audio verknüpft

- **GDPR-Compliance:** Recht auf Datenlöschung

## Performance

### Optimierungen

**Audio-Processing:**

- **Chunked Upload:** Streaming-Verarbeitung ohne vollständiges Hochladen

- **Parallel Processing:** Mehrere Chunks gleichzeitig

- **Caching:** Wiederholte Phrasen werden gecacht

- **Compression:** Audio-Kompression vor Verarbeitung

**Real-time Performance:**

- **Latency:** < 2s für erste Ergebnisse

- **Throughput:** 10 parallele Sessions

- **Memory:** < 100MB pro Session

- **CPU:** Optimierte Whisper-Inferenz

### Metriken

**Durchschnittliche Performance:**

- **Erste Ergebnisse:** < 2 Sekunden

- **Vollständige Transkription:** 1.5x Audio-Dauer

- **Genauigkeit:** > 95% für klare Audio

- **Verfügbarkeit:** > 99.5%

## Tests

### Unit-Tests

**Audio-Processing-Tests:**

- Chunk-Validierung und -Processing

- Audio-Format-Erkennung

- Session-Management

- Error-Handling

**Service-Tests:**

- Whisper-API-Integration

- KV-Storage-Operationen

- Rate-Limiting-Validierung

- Entitlements-Prüfung

### E2E-Tests

**Real-time Transkriptions-Tests:**

- Vollständiger Audio-zu-Text Flow

- SSE-Event-Verarbeitung

- Polling-Mechanismus

- Error-Recovery

**Browser-Tests:**

- MediaRecorder-Integration

- Audio-Streaming

- Real-time UI-Updates

- Cross-Browser-Kompatibilität

### Test-Daten

**Audio-Fixtures:**

- **Kurze Clips:** 5-10 Sekunden Test-Audio

- **Lange Audios:** 1-2 Minuten für Performance-Tests

- **Mehrsprachig:** Deutsch, Englisch, Französisch

- **Qualitätsvarianten:** Klar, Rauschend, Mit Akzent

## Fehlerbehebung

### Häufige Probleme

**"Audio format not supported":**

- Falsches Audio-Format oder Codec

- Verwende WebM mit Opus oder MP3

- Prüfe Browser-Unterstützung

**"Session not found":**

- SessionId ist ungültig oder abgelaufen

- Erstelle neue Session mit eindeutiger ID

- Sessions laufen nach 1 Stunde ab

**"Quota exceeded":**

- Tägliches Transkriptionslimit erreicht

- Warte bis zum Reset (24h) oder upgrade

- Prüfe `usage` und `limits` in der Response

**"Connection lost during streaming":**

- Netzwerkprobleme während der Transkription

- EventSource-Verbindung ist unterbrochen

- Starte neue Session oder verwende Polling

### Debug-Informationen

**Bei aktiviertem Debug-Panel:**

- Audio-Chunk-Metadaten

- Whisper-API-Requests/Responses

- Session-Status-Änderungen

- Performance-Metriken

- Error-Stack-Traces

## Client-Integration

### React-Hooks

**useVoiceTranscription:**

```typescript
const {
  startRecording,
  stopRecording,
  isRecording,
  transcript,
  isLoading,
  error
} = useVoiceTranscription({
  language: 'de',
  onTranscript: (text, isFinal) => {
    console.log('Transcript:', text, 'Final:', isFinal);
  }
});

```text

**useAudioRecorder:**

```typescript
const {
  isSupported,
  startRecording,
  stopRecording,
  audioBlob
} = useAudioRecorder({
  mimeType: 'audio/webm;codecs=opus',
  chunkDuration: 2000
});
```

### JavaScript-Client

```javascript
class VoiceTranscriber {
  constructor(options = {}) {
    this.sessionId = crypto.randomUUID();
    this.jobId = null;
    this.eventSource = null;
    this.chunks = [];
  }

  async startTranscription(audioStream) {
    // MediaRecorder Setup
    this.mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = async (event) => {
      await this.processChunk(event.data);
    };

    this.mediaRecorder.start(2000); // 2s Chunks
    this.connectEventSource();
  }

  async processChunk(chunk) {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('sessionId', this.sessionId);
    formData.append('isLastChunk', 'false');

    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (result.success) {
      this.jobId = result.data.jobId;
      if (result.data.text) {
        this.onTranscript(result.data.text, result.data.isFinal);
      }
    }
  }

  connectEventSource() {
    this.eventSource = new EventSource(`/api/voice/stream?jobId=${this.jobId}&sessionId=${this.sessionId}`);

    this.eventSource.addEventListener('transcript', (event) => {
      const data = JSON.parse(event.data);
      this.onTranscript(data.text, data.isFinal);
    });

    this.eventSource.addEventListener('final', (event) => {
      const data = JSON.parse(event.data);
      this.onFinal(data.text);
      this.cleanup();
    });
  }

  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

```text

## Compliance

### Datenschutz (GDPR)

**Audio-Daten-Handling:**

- **Keine Persistierung:** Audio wird nur temporär verarbeitet

- **Automatische Löschung:** Nach 1 Stunde vollständige Entfernung

- **Transkript-Trennung:** Keine Verknüpfung zwischen Audio und Text

- **User-Consent:** Klare Einwilligung für Audio-Verarbeitung

**Transkript-Speicherung:**

- **Temporär:** Transkripte werden 24h aufbewahrt

- **Anonymisierung:** Keine Verknüpfung mit Benutzerdaten

- **Löschung:** Automatische Entfernung nach Aufbewahrungsfrist

### Ethik und Verantwortung

**Verantwortungsvoller Einsatz:**

- **Einwilligung:** Klare Benutzerzustimmung erforderlich

- **Transparenz:** Offene Kommunikation über Audio-Verarbeitung

- **Datensparsamkeit:** Nur notwendige Datenverarbeitung

- **Sicherheit:** Höchste Standards für Audio-Daten

## Roadmap

### Geplante Features

**Erweiterte Audio-Features:**

- **Multi-Speaker Detection:** Erkennung verschiedener Sprecher

- **Speaker Diarization:** Sprecher-Identifikation und -Trennung

- **Emotion Recognition:** Stimmungsanalyse

- **Background Noise Reduction:** Verbesserte Audio-Qualität

**Real-time Features:**

- **Live-Übersetzung:** Echtzeit-Übersetzung in andere Sprachen

- **Keyword Spotting:** Echtzeit-Erkennung wichtiger Wörter

- **Sentiment Analysis:** Stimmungsanalyse in Echtzeit

- **Custom Vocabulary:** Branchenspezifisches Vokabular

**Integrationen:**

- **Meeting-Tools:** Zoom, Teams, Google Meet Integration

- **Voicemail-Processing:** Automatische Voicemail-Transkription

- **Podcast-Processing:** Automatische Podcast-Transkription

- **Video-Audio-Extraction:** Audio aus Videos extrahieren

### Performance-Verbesserungen

**Skalierbarkeit:**

- **Batch-Processing:** Mehrere Audio-Sessions parallel

- **CDN-Integration:** Globale Audio-Verarbeitung

- **Edge-Processing:** Cloudflare Workers AI für schnellere Verarbeitung

- **Caching:** Intelligente Cache-Strategien für wiederholte Phrasen

**Genauigkeit:**

- **Custom Models:** Branchenspezifische Whisper-Modelle

- **Fine-tuning:** Anpassung an spezifische Anwendungsfälle

- **Post-Processing:** KI-basierte Korrektur von Transkripten

- **Confidence Scores:** Zuverlässigkeitsbewertung pro Wort

```text
