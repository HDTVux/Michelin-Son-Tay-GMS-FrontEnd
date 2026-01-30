const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

async function request(path, options = {}) {
  const { method = 'GET', headers = {}, body } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    });
  } catch (err) {
    throw new Error('Không thể kết nối tới máy chủ');
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || 'Request failed';
    throw new Error(message);
  }

  if (data?.success === false) {
    throw new Error(data?.message || data?.data?.message || 'Request failed');
  }

  return data;
}

export { API_BASE_URL, request };
