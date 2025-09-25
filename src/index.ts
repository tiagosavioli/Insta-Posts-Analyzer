import Orchestrator from './core/orchestrator.js';

// Verificar argumentos da linha de comando para decidir o modo
const args = process.argv.slice(2);
const mode = args[0] || 'server'; // Default para servidor web

if (mode === 'orchestrator' || mode === 'posts') {
  // Modo orquestrador - processa posts
  console.log('🔄 Iniciando modo orquestrador...');
  
  // Coloque as urls dos posts que deseja analisar
  const POST_URLS: string[] = [
    "https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers",
    "https://www.instagram.com/api/v1/media/3727561195847795401_210278611/likers"
  ];

  const orchestrator = new Orchestrator(POST_URLS);
  orchestrator.run();
} else {
  // Modo servidor web (padrão)
  console.log('🌐 Iniciando servidor web...');
  import('./server.js');
}
