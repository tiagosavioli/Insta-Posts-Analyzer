import Orchestrator from './orchestrator.js';

// URLs dos posts para análise (formato /media/XXXX)
const POST_URLS = [
  'https://www.instagram.com/media/3723833150629057129_1448916808/',
];

// Configurações do sistema
const CONFIG = {
  finder: {
    parallelWorkers: 2,
    requestDelay: 200,
    fileDelay: 200,
    requestTimeout: 10000,
    maxRetries: 0
  },
  analyzer: {
    weightFollowerFollowingRatio: -2.0,
    weightIsPrivate: 1.0,
    weightIsVerified: -8.0,
    weightHasBiography: -3.0,
    weightHasExternalUrl: -2.0,
    weightMediaCount: -4.0,
    weightHasStories: -3.0,
    weightHasHighlights: -2.0,
    weightUsernamePattern: 2.0,
    weightFullNamePattern: 1.0,
    weightFollowerCount: -2.0,
    weightFollowingCount: 0.5,
    weightAccountAge: -1.0,
    weightHasChaining: 0.5,
    weightIsBusiness: -3.0,
    weightNumOfAdminedPages: 0.5,
    weightHasHighlightReels: -4.0,
    botThreshold: 0.448
  },
  headers: {
    "cookie": "datr=Nu3TaFC7s2F1mqAXuswKGZgq; ig_did=5EDACD49-D99C-4634-8DCF-6C021B2592A3; mid=aNPtNgALAAEADf-7nqL8lYq1N97P; ps_l=1; ps_n=1; ig_nrcb=1; csrftoken=ZAcvcQHYt5xDSPUkDPkpEnuKBi2S3nZj; ds_user_id=77180886710; sessionid=77180886710%3AEBciZFh53JOKnk%3A18%3AAYhe5mxIQzPF11igeQAqUvVDlv3TDOfMAw7QM6cPtA; wd=1182x1040; rur=\"PRN\\05477180886710\\0541790363552:01fe2a5b5b17df736271663ebda5a9943061c1adc0f1f2087343767c7b692daaa18f4b95\"",
    "x-ig-www-claim": "hmac.AR3RwX25BnAZr053YXtf7nKVDhULhKaDDd7COt5fI1ExISB5",
    "x-web-session-id": "tzh677:xmu1qs:ffgu1c",
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "dnt": "1",
    "priority": "u=1, i",
    "referer": "https://www.instagram.com/",
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
    "x-requested-with": "XMLHttpRequest"
  }
};

async function main() {
  const orchestrator = new Orchestrator(POST_URLS, CONFIG);
  await orchestrator.run();
}

await main();
