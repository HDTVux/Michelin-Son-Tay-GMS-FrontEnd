// Pipeline nén ảnh/video phía client trước khi upload trong chat.
// ffmpeg.wasm chỉ được import động (lazy) khi thực sự cần nén video lớn,
// để core wasm (~25-30MB) không nằm trong bundle khởi động của app.

const VIDEO_COMPRESS_THRESHOLD_BYTES = 18 * 1024 * 1024; // ~18MB

// Ảnh chụp mặc định của iPhone dùng định dạng HEIC/HEIF — CHỈ Safari (macOS/iOS) giải mã
// được qua <img>/canvas, mọi trình duyệt khác (Chrome/Edge/Firefox trên Windows/Android)
// đều không xem/nén được, khiến người nhận không phải dùng Safari thấy ảnh vỡ/không hiện.
// iOS thường để trống `file.type` khi chọn ảnh HEIC qua input — phải nhận diện thêm qua
// đuôi file.
const isHeicFile = (file) => {
  const type = (file?.type || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.hei[cf]$/i.test(file?.name || '');
};

/** Convert HEIC/HEIF -> JPEG (chạy trước bước nén ảnh chung) để mọi trình duyệt xem được. */
const convertHeicToJpeg = async (file) => {
  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    const jpegName = file.name.replace(/\.hei[cf]$/i, '.jpg');
    return new File([jpegBlob], jpegName || 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    // Nếu decode thất bại (file lỗi/không đúng định dạng thật), gửi file gốc — người
    // dùng Safari vẫn xem được bình thường, chỉ mất tính năng convert cho trình duyệt khác.
    return file;
  }
};

// iPhone quay video mặc định đóng gói .mov + codec HEVC (H.265) — Safari phát được nhưng
// Chrome trên Windows/Android nói chung KHÔNG phát được (thiếu hỗ trợ phần cứng/license),
// nên phải luôn convert sang .mp4/H.264 (định dạng tương thích mọi nơi) bất kể dung lượng,
// không chỉ khi vượt ngưỡng nén như trước.
const isQuickTimeFile = (file) => {
  const type = (file?.type || '').toLowerCase();
  if (type === 'video/quicktime') return true;
  return /\.mov$/i.test(file?.name || '');
};

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
  if (!file) return file;
  // HEIC/HEIF: file.type thường RỖNG trên iOS (không phải "image/heic") nên phải nhận
  // diện qua đuôi file — nếu chỉ check `file.type?.startsWith('image/')` như trước sẽ bỏ
  // qua luôn bước convert này và gửi thẳng file HEIC gốc lên server.
  const isHeic = isHeicFile(file);
  if (!isHeic && !file.type?.startsWith('image/')) return file;

  let workingFile = file;
  if (isHeic) {
    onProgress?.(0.05);
    workingFile = await convertHeicToJpeg(file);
  }

  const imageCompression = (await import('browser-image-compression')).default;

  try {
    const compressed = await imageCompression(workingFile, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      onProgress: onProgress ? (p) => onProgress(p / 100) : undefined,
    });
    return new File([compressed], workingFile.name, { type: compressed.type || workingFile.type });
  } catch {
    return workingFile;
  }
};

/**
 * Nén video nếu vượt ngưỡng kích thước, dùng ffmpeg.wasm (lazy-load). Riêng video .mov/
 * HEVC (mặc định của iPhone) LUÔN được convert sang .mp4/H.264 dù nhỏ hơn ngưỡng — vì vấn
 * đề ở đây không phải dung lượng mà là ĐỊNH DẠNG không phát được trên Chrome (Windows/
 * Android) khi người nhận không dùng Safari.
 * @param {File} file
 * @param {(progress:number)=>void} [onProgress]
 * @returns {Promise<File>}
 */
export const maybeCompressVideo = async (file, onProgress) => {
  if (!file) return file;
  const isQuickTime = isQuickTimeFile(file);
  if (!isQuickTime && !file.type?.startsWith('video/')) return file;
  if (!isQuickTime && file.size <= VIDEO_COMPRESS_THRESHOLD_BYTES) return file;

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
