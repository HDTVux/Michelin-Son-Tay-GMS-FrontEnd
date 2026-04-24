const isPersistedMediaUrl = (value) => {
  const text = String(value || '').trim();
  return Boolean(text) && !text.startsWith('blob:') && !text.startsWith('data:');
};

const extensionFromMime = (mimeType, fallback = 'jpg') => {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  return fallback;
};

const filenameFromUrl = (url, fallbackName, mimeType) => {
  try {
    const parsed = new URL(url);
    const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).at(-1) || '');
    if (lastSegment && /\.[a-z0-9]{2,5}$/i.test(lastSegment)) return lastSegment;
  } catch {
    // Use fallback below.
  }
  return `${fallbackName}.${extensionFromMime(mimeType)}`;
};

export const mediaUrlToFile = async (url, { fallbackName = 'media', fallbackType = 'image/jpeg' } = {}) => {
  const safeUrl = String(url || '').trim();
  if (!isPersistedMediaUrl(safeUrl)) return null;

  const response = await fetch(safeUrl);
  if (!response.ok) {
    throw new Error('Không thể đọc lại ảnh/video cũ để giữ khi cập nhật.');
  }

  const blob = await response.blob();
  const type = blob.type || fallbackType;
  const filename = filenameFromUrl(safeUrl, fallbackName, type);
  return new File([blob], filename, { type });
};

export const appendPersistedServiceMediaFiles = async ({
  formData,
  thumbnailFile,
  thumbnailPreview,
  existingMedia,
}) => {
  if (!thumbnailFile && isPersistedMediaUrl(thumbnailPreview)) {
    const thumbnailUpload = await mediaUrlToFile(thumbnailPreview, {
      fallbackName: 'thumbnail',
      fallbackType: 'image/jpeg',
    });
    if (thumbnailUpload) formData.append('thumbnailFile', thumbnailUpload);
  }

  const savedMedia = Array.isArray(existingMedia) ? existingMedia : [];
  for (const [index, entry] of savedMedia.entries()) {
    const mediaUpload = await mediaUrlToFile(entry?.mediaUrl, {
      fallbackName: `media-${index + 1}`,
      fallbackType: entry?.isVideo ? 'video/mp4' : 'image/jpeg',
    });
    if (mediaUpload) formData.append('mediaFiles', mediaUpload);
  }
};

export { isPersistedMediaUrl };
