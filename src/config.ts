import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FinderConfig, RankerConfig, AppConfig } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para carregar configurações do config.json
async function loadConfig(): Promise<AppConfig> {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const content = await fs.readFile(configPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Erro ao carregar config.json: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}

// Função para carregar configuração do finder
export async function loadFinderConfig(): Promise<FinderConfig> {
    const config = await loadConfig();
    return config.finder;
}

// Função para carregar configuração do ranker
export async function loadRankerConfig(): Promise<RankerConfig> {
    const config = await loadConfig();
    return config.ranker;
}

// Função para carregar configuração completa
export async function loadAppConfig(): Promise<AppConfig> {
    return await loadConfig();
}

// Headers para requisições
export const headerConfig: Record<string, string> = {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "cookie": "datr=Nu3TaFC7s2F1mqAXuswKGZgq; ig_did=5EDACD49-D99C-4634-8DCF-6C021B2592A3; mid=aNPtNgALAAEADf-7nqL8lYq1N97P; ps_l=1; ps_n=1; ig_nrcb=1; csrftoken=ZAcvcQHYt5xDSPUkDPkpEnuKBi2S3nZj; ds_user_id=77180886710; sessionid=77180886710%3AEBciZFh53JOKnk%3A18%3AAYgquxZ9OhAgNMA3rFH98lTV7VaRT8CWJoJ9pQGY_Q; wd=715x1040; rur=\"LDC\\05477180886710\\0541790266930:01fecc83b8011e351e12446cf8a211f15a16128273c976b322619809a46e0e5e2dc3afbd\"",
    "dnt": "1",
    "priority": "u=1, i",
    "referer": "https://www.instagram.com/p/DOttoVSEZJp/",
    "sec-ch-prefers-color-scheme": "dark",
    "sec-ch-ua": "\"Not=A?Brand\";v=\"24\", \"Chromium\";v=\"140\"",
    "sec-ch-ua-full-version-list": "\"Not=A?Brand\";v=\"24.0.0.0\", \"Chromium\";v=\"140.0.7339.186\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": "\"\"",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-ch-ua-platform-version": "\"15.0.0\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "x-asbd-id": "359341",
    "x-csrftoken": "ZAcvcQHYt5xDSPUkDPkpEnuKBi2S3nZj",
    "x-ig-app-id": "936619743392459",
    "x-ig-www-claim": "hmac.AR3ciYD_f3Sjt6GAP61J241TVo-GoqWFZ2ScYLtpAfU2bSEl",
    "x-requested-with": "XMLHttpRequest",
    "x-web-session-id": "ankigh:98yrfj:m2s3qs"
};
