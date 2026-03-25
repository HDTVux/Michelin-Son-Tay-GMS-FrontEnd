import { request } from './apiClient';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const ensurePositiveId = (value, fieldName) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    const error = new Error(`${fieldName} không h?p l?.`);
    error.status = 400;
    throw error;
  }
  return num;
};

export const enableSafetyInspection = (ticketCode, token) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thi?u ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/${code}/enable`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const reopenSafetyInspection = (ticketCode, token) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thi?u ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/${code}/reopen`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const skipSafetyInspection = (ticketCode, reason = '', token) => {
  void reason;
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thi?u ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/${code}/skip`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const getSafetyInspectionById = (inspectionId, token) => {
  const id = ensurePositiveId(inspectionId, 'inspectionId');
  return request(`/api/safety-inspections/${id}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const getSafetyInspectionByTicketCode = (ticketCode, token) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thi?u ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/service-ticket/${code}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const saveSafetyInspectionData = (payload, token) => {
  return request('/api/safety-inspections', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload ?? {}),
  });
};

export const updateSafetyInspectionData = (inspectionId, payload, token) => {
  const id = ensurePositiveId(inspectionId, 'inspectionId');
  return request(`/api/safety-inspections/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload ?? {}),
  });
};

export const getDefaultSafetyInspectionCategories = (token) => {
  return request('/api/safety-inspections/categories/default', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

// Backward-compatible alias for older screens.
export const getSafetyInspectionCategories = (token) => getDefaultSafetyInspectionCategories(token);

export const getSafetyInspectionItems = (inspectionId, token) => {
  const id = ensurePositiveId(inspectionId, 'inspectionId');
  return request(`/api/safety-inspections/${id}/items`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const addCustomCategory = (inspectionId, payload, token) => {
  const id = ensurePositiveId(inspectionId, 'inspectionId');
  const body = {
    categoryName: payload?.categoryName?.trim() || '',
    displayOrder: payload?.displayOrder != null ? Number(payload.displayOrder) : null,
  };

  return request(`/api/safety-inspections/${id}/custom-categories`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
};

// Backward-compatible export name used by Technician screen.
export const createWorkCategory = (inspectionId, payload, token) => {
  if (typeof inspectionId === 'object' && token == null) {
    const error = new Error('Thi?u inspectionId d? thêm h?ng m?c tùy ch?nh.');
    error.status = 400;
    return Promise.reject(error);
  }
  return addCustomCategory(inspectionId, payload, token);
};

export const upsertSafetyInspectionItems = (inspectionId, items, token) => {
  const id = ensurePositiveId(inspectionId, 'inspectionId');
  return request(`/api/safety-inspections/${id}/items`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(Array.isArray(items) ? items : []),
  });
};

export const updateAdvisorNotes = (inspectionId, items, token) => {
  const id = ensurePositiveId(inspectionId, 'inspectionId');
  return request(`/api/safety-inspections/${id}/advisor-notes`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ items: Array.isArray(items) ? items : [] }),
  });
};

// Backward-compatible helper used by Advisor page.
export const updateAdvisorNote = (inspectionId, itemOrItemId, advisorNoteOrToken, maybeToken) => {
  let token = maybeToken;
  let itemPayload;

  if (typeof itemOrItemId === 'object' && itemOrItemId !== null) {
    token = advisorNoteOrToken;
    itemPayload = {
      workCategoryId: itemOrItemId.workCategoryId ?? null,
      customCategoryId: itemOrItemId.customCategoryId ?? null,
      advisorNote: itemOrItemId.advisorNote ?? '',
    };
  } else {
    itemPayload = {
      workCategoryId: Number(itemOrItemId),
      customCategoryId: null,
      advisorNote: advisorNoteOrToken ?? '',
    };
  }

  return updateAdvisorNotes(inspectionId, [itemPayload], token);
};

