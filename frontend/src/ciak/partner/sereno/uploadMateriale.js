import { API } from '../../../utils/api-config';
import { authHeaders } from '../api';

/**
 * Sends a partner's file to the real endpoint the Percorso steps already use
 * (POST /api/partner-journey/operativo/upload/{partner_id}): it stores the file,
 * registers it in the `files` collection that the Materiali page reads, and
 * tells the team. XHR instead of fetch only because fetch cannot report progress.
 *
 * Resolves { ok:true, fallback? } or { ok:false, error } — never throws, and never
 * claims success unless the server answered with success:true.
 */
export function uploadPartnerFile(partnerId, file, onProgress = () => {}, makeXhr = () => new XMLHttpRequest(), { notify = true } = {}) {
  return new Promise((resolve) => {
    const xhr = makeXhr();
    const body = new FormData();
    body.append('file', file);
    // notify=false: an admin uploading on the partner's behalf must not raise the "il partner ha caricato" alert.
    xhr.open('POST', `${API}/api/partner-journey/operativo/upload/${partnerId}${notify ? '' : '?notify=false'}`);
    const headers = authHeaders();
    Object.keys(headers).forEach((k) => xhr.setRequestHeader(k, headers[k]));
    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
    }
    xhr.onerror = () => resolve({ ok: false, error: 'network' });
    xhr.ontimeout = () => resolve({ ok: false, error: 'network' });
    xhr.onload = () => {
      if (xhr.status === 401 || xhr.status === 403) return resolve({ ok: false, error: 'auth' });
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && data && data.success === true) {
        onProgress(100);
        return resolve({ ok: true, fallback: data.fallback || null });
      }
      return resolve({ ok: false, error: 'server' });
    };
    xhr.send(body);
  });
}
