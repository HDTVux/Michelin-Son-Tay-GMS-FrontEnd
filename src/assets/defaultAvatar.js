import defaultAvatar from './Copy of Logo.webp';

export const DEFAULT_AVATAR = defaultAvatar;

export const getAvatarSrc = (avatar) => {
  const value = typeof avatar === 'string' ? avatar.trim() : '';
  return value || DEFAULT_AVATAR;
};

export const handleAvatarError = (event) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = DEFAULT_AVATAR;
};
