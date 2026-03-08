


export function createPageUrl(pageName: string, params: Record<string, string> = {}) {
    let url = '/' + pageName.replace(/ /g, '');
    const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
    if (queryString) url += '?' + queryString;
    return url;
}