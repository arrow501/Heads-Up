import axios from "axios";

const apiKey = process.env.API_KEY;
const searchEngineId = process.env.SEARCH_ENGINE_ID;
const FALLBACK = 'url("/images/429-status-code.png")';

export async function fetchImageUrl(query) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&searchType=image&q=${encodeURIComponent(query)}&num=1`;
  try {
    const { data } = await axios.get(url);
    return data.items?.[0]?.link ?? FALLBACK;
  } catch (err) {
    const status = err.response?.status;
    console.error(`Google image search failed${status ? ` (HTTP ${status})` : " (network error)"}: ${query}`);
    return FALLBACK;
  }
}
