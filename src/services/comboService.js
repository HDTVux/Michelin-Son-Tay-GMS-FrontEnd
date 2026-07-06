import { request } from './apiClient.js';

export const fetchComboItems = (catalogId, odometerKm, token) => {
  const path = `/api/service/combo/${catalogId}${odometerKm != null ? `?odometerKm=${odometerKm}` : ''}`;
  return request(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const saveComboItems = (catalogId, comboItemsPayload, token) => {
  return request(`/api/service/combo/${catalogId}`, {
    method: 'PUT',
    headers: token ? {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    } : {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comboItemsPayload),
  });
};
