/**
 * リトライ付きの fetch 関数
 *
 * @param resource - 取得したいリソース
 * @param options - リクエストのオプション
 * @param retryCount - エラー時にリトライする回数。
 * @returns リクエストの結果
 */
async function fetchWithRetry(resource: RequestInfo | URL, options?: RequestInit, retryCount = 3): Promise<Response> {
  try {
    const response = await fetch(resource, options);
    if (response.status >= 500) {
      throw new Error(`HTTPエラー ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (e) {
    if (retryCount === 1) throw e;
    return await fetchWithRetry(resource, options, retryCount - 1);
  }
}

export { fetchWithRetry };
