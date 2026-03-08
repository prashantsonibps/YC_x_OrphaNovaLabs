export function createPageUrl(pageName, params = {}) {
  let url = `/${pageName}`;
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  if (queryString) {
    url += `?${queryString}`;
  }
  return url;
}