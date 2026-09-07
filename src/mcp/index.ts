import { MoranteHubMcpServer } from './server.js';

const isStdio = process.argv.includes('--stdio');
const server = new MoranteHubMcpServer();

if (isStdio) {
  server.startStdio().catch(err => {
    console.error('Falha ao iniciar MCP via Stdio:', err);
    process.exit(1);
  });
} else {
  const port = Number(process.env.MCP_PORT) || 3333;
  server.startHttp(port).catch(err => {
    console.error(`Falha ao iniciar MCP HTTP na porta ${port}:`, err);
    process.exit(1);
  });
}

export { MoranteHubMcpServer };
