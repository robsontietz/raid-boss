# GUARDIAN RAID WATCH — Agente Windows

Agente local que fica de olho na lista **RAID** do Lineage 2, percebe quando a cor do nome de
um dos 20 Raid Bosses muda e avisa no Discord.

## Requisitos

- Windows 10 ou 11
- Python 3.10 ou mais novo — https://www.python.org/downloads/
  (durante a instalação marque **"Add python.exe to PATH"**)
- Lineage 2 em **modo janela** ou **tela cheia sem bordas** (a tela cheia exclusiva fica preta na captura)

## Instalação (uma vez só)

1. Extraia esta pasta em um local fixo, por exemplo `C:\GuardianRaidWatch`.
2. Dê dois cliques em **`instalar.bat`** e espere terminar.

## Uso

1. Abra o Lineage 2 e deixe a janela da lista (abas *Hunting Zone* / *Raid*) aberta.
2. Dê dois cliques em **`iniciar.bat`**. Uma janela preta mostra o **endereço** e o **token**.
3. Abra o painel web, vá em **Configurações → Conexão com o agente**, cole o token e clique em *Conectar*.
4. Em **Calibração**:
   1. clique em *Capturar tela do jogo*;
   2. clique no botão **RAID** da imagem;
   3. arraste um retângulo cobrindo **somente os nomes** dos 20 bosses (do primeiro ao último);
   4. confira se as linhas desenhadas caem em cima de cada nome e salve;
   5. clique em *Capturar referência* (com a lista visível).
5. Em **Configurações**, cole o Webhook do Discord e use *Testar Discord*.
6. No painel principal clique em **Iniciar monitoramento**.

Deixe a janela do agente aberta enquanto joga. Para encerrar, feche-a ou aperte `CTRL+C`.

## Onde ficam os dados

| Arquivo | Conteúdo |
| --- | --- |
| `data/config.json` | Webhook, token de acesso, calibração e preferências |
| `data/state.json` | Última cor confirmada de cada boss (não se perde ao reiniciar) |
| `data/events.json` | Histórico de alterações e status do envio ao Discord |
| `data/reference.npz` | Formato dos nomes usado para confirmar que a lista está visível |
| `logs/agent.log` | Registro de erros de captura e comunicação |

O Webhook e o token **não** ficam no código-fonte. Não compartilhe `data/config.json`.

## Segurança

- O agente escuta apenas em `127.0.0.1` (o próprio computador); nada fica exposto na internet.
- Toda chamada do painel precisa do token.
- Para gerar um token novo, apague a linha `"token"` em `data/config.json` e reinicie.

## Como a detecção funciona

1. Encontra a janela do jogo pelo título **e** pelo nome do processo (`L2.exe` por padrão),
   para nunca confundir com uma aba do navegador.
2. Só clica se a janela existir, não estiver minimizada, tiver o mesmo tamanho da calibração
   e (no modo *mouse*) estiver em primeiro plano.
3. Dá dois cliques no botão RAID e **verifica a tela de novo**: compara o formato dos nomes com a
   referência. Se a lista não estiver visível, registra o problema e tenta no próximo ciclo —
   isso nunca conta como mudança.
4. Para cada linha, separa os pixels do texto, ignora bordas suavizadas e sombras, e mede a cor
   predominante. Variações de brilho pesam pouco; mudanças de tom (cinza → vermelho, etc.) pesam muito.
5. Uma mudança só é confirmada após leituras consecutivas iguais (padrão: 2, com nova captura em ~1 s).
6. Confirmada a mudança, envia **uma** mensagem ao Discord. Enquanto o boss ficar na nova cor,
   nada é repetido. Uma nova mudança gera uma nova mensagem.

## Problemas comuns

- **"Janela do Lineage 2 não encontrada"**: ajuste o título ou o processo em Configurações → Janela do jogo
  (use *Listar janelas abertas* para ver os nomes exatos).
- **"O jogo não está em primeiro plano"**: no modo *mouse* o agente não clica se outra janela estiver na frente.
  Ative *Trazer o jogo para frente* ou use o modo *segundo plano* (nem todo cliente aceita).
- **"O tamanho da janela mudou"**: refaça a calibração.
- **Captura preta**: troque para modo janela/sem bordas.
- **Cliques não funcionam**: alguns servidores com anti-cheat bloqueiam cliques simulados.
  Execute o `iniciar.bat` como administrador (o jogo também roda como administrador em muitos servidores).

## Testes (opcional, para desenvolvedores)

```
.venv\Scripts\python.exe -m pip install pytest
.venv\Scripts\python.exe -m pytest tests
```
