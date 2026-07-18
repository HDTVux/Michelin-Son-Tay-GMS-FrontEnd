// Pipeline nén ảnh/video phía client trước khi upload trong chat.
// ffmpeg.wasm chỉ được import động (lazy) khi thực sự cần nén video lớn,
// để core wasm (~25-30MB) không nằm trong bundle khởi động của app.

const VIDEO_COMPRESS_THRESHOLD_BYTES = 18 * 1024 * 1024; // ~18MB

let ffmpegInstance = null;
let ffmpegLoadPromise = null;

const loadFfmpeg = async (onProgress) => {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(Math.min(0.95, Math.max(0, progress))));
    }

    // Core wasm được host cục bộ tại public/ffmpeg/ (copy từ node_modules/@ffmpeg/core),
    // không phụ thuộc CDN ngoài. Bản single-thread: không cần header COOP/COEP (SharedArrayBuffer).
    const baseURL = '/ffmpeg';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
};

/**
 * Nén ảnh trước upload (đích ~1MB / cạnh dài tối đa 1920px).
 * @param {File} file
 * @param {(progress:number)=>void} [onProgress]
 * @returns {Promise<File>}
 */
export const compressImage = async (file, onProgress) => {
  if (!file || !file.type?.startsWith('image/')) return file;

  const imageCompression = (await import('browser-image-compression')).default;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      onProgress: onProgress ? (p) => onProgress(p / 100) : undefined,
    });
    return new File([compressed], file.name, { type: compressed.type || file.type });
  } catch {
    return file;
  }
};

/**
 * Nén video nếu vượt ngưỡng kích thước, dùng ffmpeg.wasm (lazy-load).
 * @param {File} file
 * @param {(progress:number)=>void} [onProgress]
 * @returns {Promise<File>}
 */
export const maybeCompressVideo = async (file, onProgress) => {
  if (!file || !file.type?.startsWith('video/')) return file;
  if (file.size <= VIDEO_COMPRESS_THRESHOLD_BYTES) return file;

  try {
    const ffmpeg = await loadFfmpeg(onProgress);
    const { fetchFile } = await import('@ffmpeg/util');

    const inputName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] || '.mp4');
    const outputName = 'output.mp4';

    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
      '-i', inputName,
      '-vcodec', 'libx264',
      '-crf', '30',
      '-preset', 'veryfast',
      '-vf', "scale='min(1280,iw)':-2",
      '-acodec', 'aac',
      '-b:a', '96k',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    onProgress?.(1);

    return new File([data.buffer ? data.buffer : data], file.name.replace(/\.[^.]+$/, '.mp4'), {
      type: 'video/mp4',
    });
  } catch {
    // Nếu nén thất bại (thiết bị yếu, trình duyệt không hỗ trợ...), gửi file gốc.
    return file;
  }
};

export const CHAT_VIDEO_COMPRESS_THRESHOLD_BYTES = VIDEO_COMPRESS_THRESHOLD_BYTES;
