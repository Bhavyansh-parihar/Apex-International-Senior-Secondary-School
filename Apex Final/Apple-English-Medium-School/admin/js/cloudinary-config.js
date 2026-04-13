/* ============================================
   CLOUDINARY CONFIG  — Apex International School
   Safe for frontend: cloud name + upload preset only.
   SECRET KEY must NEVER appear here.

   SETUP CHECKLIST (do this once in Cloudinary dashboard):
   1. Go to https://cloudinary.com → Settings → Upload
   2. Scroll to "Upload presets" → Add upload preset
   3. Set "Signing Mode" to UNSIGNED
   4. Set "Folder" to: apex_school
   5. Under "Upload Manipulations" add:
        - Incoming transformation: f_auto,q_auto:good,w_1400
   6. Copy the preset name and paste below as UPLOAD_PRESET
   7. Copy your Cloud Name from the dashboard top-left and paste below
   ============================================ */

const CloudinaryConfig = {

    // ── Replace these two values with yours ──────────────────────────
    CLOUD_NAME: 'dj3lji0ar',       // e.g. 'dxyz123abc'
    UPLOAD_PRESET: 'apex_school_unsigned', // e.g. 'apex_school_unsigned'
    // ─────────────────────────────────────────────────────────────────

    /**
     * Upload a base64 data URL or File object to Cloudinary.
     * Returns a Promise that resolves to the Cloudinary response object,
     * which includes: { secure_url, public_id, width, height, format }
     *
     * @param {string|File} fileOrDataUrl  - base64 data URL or File object
     * @param {string}      folder         - sub-folder inside your Cloudinary account
     * @param {Function}    onProgress     - optional callback(percent: 0–100)
     */
    upload(fileOrDataUrl, folder = 'apex_school', onProgress = null) {
        return new Promise((resolve, reject) => {
            if (!this.CLOUD_NAME || this.CLOUD_NAME === 'YOUR_CLOUD_NAME') {
                reject(new Error('Cloudinary CLOUD_NAME is not configured. Open admin/js/cloudinary-config.js and fill in your credentials.'));
                return;
            }
            if (!this.UPLOAD_PRESET || this.UPLOAD_PRESET === 'YOUR_UNSIGNED_PRESET') {
                reject(new Error('Cloudinary UPLOAD_PRESET is not configured. Create an unsigned preset in your Cloudinary dashboard.'));
                return;
            }

            const formData = new FormData();
            formData.append('file', fileOrDataUrl);         // accepts base64 data URL or File
            formData.append('upload_preset', this.UPLOAD_PRESET);
            formData.append('folder', folder);

            const xhr = new XMLHttpRequest();

            // Progress tracking
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        onProgress(Math.round((e.loaded / e.total) * 100));
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        reject(new Error('Invalid response from Cloudinary.'));
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.error?.message || `Upload failed (HTTP ${xhr.status})`));
                    } catch {
                        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error — check your internet connection.')));
            xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`);
            xhr.send(formData);
        });
    },

    /**
     * Get an optimised Cloudinary URL with transformations baked in.
     * Falls back to the original URL if it's not a Cloudinary URL.
     *
     * @param {string} url       - original Cloudinary secure_url
     * @param {object} options   - { width, quality, format }
     */
    optimizeUrl(url, { width = 'auto', quality = 'auto', format = 'auto' } = {}) {
        if (!url || !url.includes('cloudinary.com')) return url;
        // Insert transformation string right after /upload/
        const transform = `f_${format},q_${quality}${width !== 'auto' ? ',w_' + width : ''}`;
        return url.replace('/upload/', `/upload/${transform}/`);
    }
};
