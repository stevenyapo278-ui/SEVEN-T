const DEFAULT_INGEST_ID = '31a655ad-0928-4b39-85fe-a1b0063e2ef3';

export function debugIngest(payload) {
    const baseUrl = process.env.DEBUG_INGEST_URL;
    if (!baseUrl) return;
    const ingestId = process.env.DEBUG_INGEST_ID || DEFAULT_INGEST_ID;
    const url = `${baseUrl.replace(/\/$/, '')}/ingest/${ingestId}`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

