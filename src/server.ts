import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiResponse, AnalysisFile, GlobalStats, AppConfig, ProcessResult, AnalysisResult } from './types/index.js';
import { loadAppConfig } from './config.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Carrega configuração do config.json
const getDefaultConfig = async (): Promise<AppConfig> => {
    try {
        return await loadAppConfig();
    } catch (error) {
        console.error('Erro ao carregar config.json:', error);
        throw error;
    }
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Servir arquivos estáticos da pasta output
app.use('/output', express.static('output'));

// Rota principal
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Função para executar comandos com tratamento de erro
async function executeCommand(command: string): Promise<ProcessResult> {
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: path.join(__dirname, '..') });
        
        if (stderr && !stderr.includes('warning')) {
            return {
                success: false,
                message: stderr,
                stderr
            };
        }
        
        return {
            success: true,
            message: 'Comando executado com sucesso',
            stdout
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            stderr: error instanceof Error ? error.message : undefined
        };
    }
}

// API para executar processo completo
app.post('/api/run-full-process', async (req: Request, res: Response<ApiResponse>) => {
    try {
        console.log('Iniciando processo completo...');
        const result = await executeCommand('npm start');
        
        res.json({
            success: result.success,
            message: result.success ? 'Processo completo executado com sucesso' : result.message,
            data: result.stdout
        });
    } catch (error) {
        console.error('Erro no processo completo:', error);
        res.json({
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});

// API para executar apenas ranker
app.post('/api/run-ranker', async (req: Request, res: Response<ApiResponse>) => {
    try {
        console.log('Iniciando detecção de bots...');
        const result = await executeCommand('npm run ranker');
        
        res.json({
            success: result.success,
            message: result.success ? 'Detecção de bots executada com sucesso' : result.message,
            data: result.stdout
        });
    } catch (error) {
        console.error('Erro no ranker:', error);
        res.json({
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});

// API para listar apenas arquivos de análise
app.get('/api/files', async (req: Request, res: Response<AnalysisFile[]>) => {
    try {
        const outputDir = path.join(__dirname, '..', 'output');
        const analysisFiles: AnalysisFile[] = [];
        
        try {
            const entries = await fs.readdir(outputDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('post-')) {
                    const postDir = path.join(outputDir, entry.name);
                    const analysisFilePath = path.join(postDir, 'users.analysis.json');
                    
                    try {
                        const stats = await fs.stat(analysisFilePath);
                        const content = await fs.readFile(analysisFilePath, 'utf8');
                        const data: AnalysisResult = JSON.parse(content);
                        
                        // Extrair informações do post da pasta
                        const postId = entry.name.replace('post-', '');
                        
                        analysisFiles.push({
                            postId: postId,
                            fileName: 'users.analysis.json',
                            modified: stats.mtime.toLocaleString('pt-BR'),
                            rawData: data,
                            analysis: data.analysis
                        });
                    } catch (err) {
                        // Arquivo de análise não existe ou inválido
                        continue;
                    }
                }
            }
        } catch (err) {
            // Diretório output não existe
            return res.json([]);
        }
        
        // Ordenar por data de modificação (mais recente primeiro)
        analysisFiles.sort((a, b) => new Date(b.analysis.timestamp).getTime() - new Date(a.analysis.timestamp).getTime());
        
        res.json(analysisFiles);
    } catch (error) {
        console.error('Erro ao listar arquivos:', error);
        res.json([]);
    }
});

// API para carregar conteúdo de arquivo JSON específico
app.get('/api/json/:postId/:filename', async (req: Request, res: Response) => {
    try {
        const { postId, filename } = req.params;
        
        // Validar nome do arquivo para segurança
        const allowedFiles = ['users.json', 'users.enriched.json', 'users.analysis.json'];
        if (!allowedFiles.includes(filename)) {
            return res.status(400).json({ error: 'Arquivo não permitido' });
        }
        
        const filePath = path.join(__dirname, '..', 'output', `post-${postId}`, filename);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            res.json(data);
        } catch (err) {
            res.status(404).json({ error: 'Arquivo não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao carregar arquivo JSON:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// API para obter estatísticas globais
app.get('/api/stats', async (req: Request, res: Response<GlobalStats>) => {
    try {
        const outputDir = path.join(__dirname, '..', 'output');
        let totalPosts = 0;
        let totalUsers = 0;
        let totalBots = 0;
        const botPercentages: number[] = [];
        
        try {
            const entries = await fs.readdir(outputDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('post-')) {
                    const analysisFilePath = path.join(outputDir, entry.name, 'users.analysis.json');
                    
                    try {
                        const content = await fs.readFile(analysisFilePath, 'utf8');
                        const data: AnalysisResult = JSON.parse(content);
                        
                        totalPosts++;
                        totalUsers += data.analysis.totalUsers;
                        totalBots += data.analysis.totalPossibleBots;
                        botPercentages.push(parseFloat(data.analysis.botPercentage));
                    } catch (err) {
                        // Arquivo inválido ou não existe
                        continue;
                    }
                }
            }
        } catch (err) {
            // Diretório não existe
        }
        
        const avgBotPercentage = botPercentages.length > 0
            ? (botPercentages.reduce((sum, p) => sum + p, 0) / botPercentages.length).toFixed(2)
            : '0.00';
        
        res.json({
            totalPosts,
            totalUsers,
            totalBots,
            avgBotPercentage
        });
    } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
        res.json({
            totalPosts: 0,
            totalUsers: 0,
            totalBots: 0,
            avgBotPercentage: '0.00'
        });
    }
});

// API para carregar configuração
app.get('/api/config', async (req: Request, res: Response<AppConfig>) => {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        
        try {
            const content = await fs.readFile(configPath, 'utf8');
            const fileConfig = JSON.parse(content);
            
            // Combinar configuração padrão com arquivo
            const defaultConfig = await getDefaultConfig();
            const config: AppConfig = {
                finder: {
                    ...defaultConfig.finder,
                    ...(fileConfig.finder || {})
                },
                ranker: {
                    ...defaultConfig.ranker,
                    ...(fileConfig.ranker || {})
                }
            };
            
            res.json(config);
        } catch (err) {
            // Arquivo não existe, retornar configuração padrão
            res.json(await getDefaultConfig());
        }
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        res.json(await getDefaultConfig());
    }
});

// API para salvar configuração
app.post('/api/config', async (req: Request, res: Response<ApiResponse>) => {
    try {
        const config: AppConfig = req.body;
        const configPath = path.join(__dirname, '..', 'config.json');
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        res.json({
            success: true,
            message: 'Configuração salva com sucesso'
        });
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        res.json({
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});

// API para executar análise personalizada com configuração customizada
app.post('/api/run-custom-analysis', async (req: Request, res: Response<ApiResponse>) => {
    try {
        const config: AppConfig = req.body;
        const configPath = path.join(__dirname, '..', 'config.json');
        
        // Salvar configuração temporariamente
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        console.log('Iniciando análise personalizada...');
        const result = await executeCommand('npm run ranker');
        
        res.json({
            success: result.success,
            message: result.success ? 'Análise personalizada executada com sucesso' : result.message,
            data: result.stdout
        });
    } catch (error) {
        console.error('Erro na análise personalizada:', error);
        res.json({
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Interface web disponível para análise de bots do Instagram');
});
