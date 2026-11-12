# Raid Boss

# GUARDIAN RAID WATCH
## Monitoramento automático de Raid Bosses do Lineage 2 com notificações no Discord

### 1. OBJETIVO DO PROJETO

Desenvolver uma aplicação chamada **GUARDIAN RAID WATCH**, destinada ao monitoramento visual automático dos Raid Bosses do jogo Lineage 2.

A aplicação deverá acompanhar a lista de Raid Bosses exibida dentro do jogo, identificar alterações nas cores dos nomes dos bosses e enviar notificações automaticamente para um canal do Discord.

A funcionalidade principal é monitorar visualmente os nomes dos bosses, sem depender de APIs do jogo, leitura de memória ou modificações nos arquivos do Lineage 2.

### 2. REFERÊNCIA VISUAL

Utilizar a imagem de referência fornecida como modelo da interface do jogo.

A lista fica dentro de uma janela com duas opções na parte superior:

- Hunting Zone
- Raid

O botão **RAID** é responsável por atualizar/exibir a lista de Raid Bosses.

A aplicação deverá localizar a janela do Lineage 2 e interagir diretamente com esse botão.

### 3. LISTA DE RAID BOSSES

Monitorar individualmente os seguintes 20 bosses:

**Nível 87**
1. [Lv.87] Core of Chaos
2. [Lv.87] Orfen of Chaos
3. [Lv.87] Chaos Queen Ant
4. [Lv.87] Zaken of Chaos
5. [Lv.87] Gourd
6. [Lv.87] Immortal Gourd

**Nível 90**
7. [Lv.90] Kuroboros' High Priest
8. [Lv.90] Palibati Queen Themis
9. [Lv.90] Monster Bulleroth
10. [Lv.90] Evil Orc Dephracor
11. [Lv.90] Antharas
12. [Lv.90] Lilith
13. [Lv.90] Anakim
14. [Lv.90] Katuba

**Nível 91**
15. [Lv.91] Floki
16. [Lv.91] Bjorn
17. [Lv.91] Ivar
18. [Lv.91] Zahir
19. [Lv.91] Rashid
20. [Lv.91] Krusha

Todos os 20 nomes devem ser monitorados individualmente.

### 4. FUNCIONALIDADE PRINCIPAL: MONITORAMENTO VISUAL

Criar um agente local para Windows, responsável pela interação com o jogo.

Tecnologias sugeridas:
- Python.
- MSS para captura da tela.
- OpenCV para análise de pixels e cores.
- PyAutoGUI para interação com mouse.
- OCR como mecanismo auxiliar para identificação dos nomes.

O agente deverá:

1. Identificar a janela do Lineage 2 em execução.
2. Localizar a posição do botão RAID.
3. Executar dois cliques sequenciais no botão RAID para atualizar a lista.
4. Capturar a imagem da região onde aparecem os 20 Raid Bosses.
5. Analisar individualmente a cor do texto de cada boss.
6. Comparar as cores encontradas com o último estado registrado.
7. Identificar qualquer alteração de cor.
8. Enviar imediatamente uma notificação ao Discord quando detectar uma mudança.

O processo deverá ser repetido continuamente, em intervalos configuráveis.

IMPORTANTE:
Não presumir que a lista atualiza apenas porque houve um clique. O agente precisa efetivamente verificar a tela após os dois cliques.

O sistema deve permitir configurar as coordenadas do botão RAID e da região da lista, preferencialmente por um assistente visual de calibração.

A detecção deverá considerar a cor predominante dos pixels pertencentes ao texto, evitando confundir alterações de brilho, antialiasing, sombras e pequenas variações de captura com mudanças reais de estado.

### 5. IDENTIFICAÇÃO DE ALTERAÇÃO DE COR

A imagem de referência mostra:

- Boss em Standby: nome apresentado em cinza.
- Boss em In Battle: nome apresentado em vermelho.
- Boss em Live: nome apresentado em outras cores.

Essas cores são referências iniciais, não regras fixas.

O sistema deverá detectar qualquer mudança relevante de cor, inclusive outras cores que possam aparecer futuramente.

Exemplo:

Estado inicial:

Zaken of Chaos: CINZA (Standby)

Após atualização:

Zaken of Chaos: VERMELHO (In Battle)

Resultado:

O sistema identifica a alteração e envia uma notificação ao Discord.

Não monitorar somente o Zaken. Qualquer um dos 20 nomes poderá sofrer alteração e deverá gerar notificação.

### 6. NOTIFICAÇÕES NO DISCORD

Implementar integração por Discord Webhook.

O usuário deverá informar a URL do Webhook nas configurações.

Quando houver alteração, enviar uma mensagem semelhante a:

🚨 **GUARDIAN RAID WATCH**

⚔️ **ALTERAÇÃO DE RAID BOSS DETECTADA!**

Boss: Zaken of Chaos  
Nível: 87  
Estado anterior: Standby  
Novo estado: In Battle  
Horário: 21:35:42

A notificação deverá identificar corretamente o boss e sua mudança de estado.

Enviar uma notificação para cada boss cuja cor tenha mudado.

Implementar proteção contra notificações duplicadas: uma mesma alteração não poderá gerar dezenas de mensagens consecutivas enquanto o boss permanecer na nova cor.

Se houver uma nova mudança posteriormente, uma nova notificação deverá ser enviada.

### 7. INTERFACE DA APLICAÇÃO

Criar um painel moderno, com identidade visual inspirada em Lineage 2.

Nome: GUARDIAN RAID WATCH.

O painel deverá conter:

**PAINEL PRINCIPAL**

- Status do monitoramento: ATIVO / PARADO.
- Status da conexão com o agente Windows.
- Status da conexão com o Discord.
- Horário da última atualização da lista.
- Tempo até a próxima atualização.
- Quantidade de bosses monitorados.
- Quantidade de alterações detectadas.

**LISTA DE BOSSES**

Exibir os 20 bosses em uma tabela contendo:

- Nome.
- Nível.
- Estado atual.
- Cor detectada.
- Última alteração.
- Status do monitoramento.

Utilizar indicadores visuais:

- Cinza: Standby.
- Vermelho: In Battle.
- Outras cores: apresentar a cor detectada sem presumir seu significado.

**HISTÓRICO DE EVENTOS**

Criar uma lista com todas as alterações detectadas:

- Nome do boss.
- Estado anterior.
- Novo estado.
- Horário da detecção.
- Status do envio ao Discord.

### 8. CONFIGURAÇÕES

Criar uma tela de configurações com:

- URL do Discord Webhook.
- Intervalo entre atualizações.
- Tempo entre os dois cliques no botão RAID.
- Configuração da janela do Lineage 2.
- Calibração da posição do botão RAID.
- Calibração da área da lista.
- Sensibilidade da detecção de cores.
- Botão para testar conexão com Discord.
- Botão para testar captura da tela.
- Botão para testar os dois cliques no RAID.

Permitir iniciar e interromper o monitoramento manualmente.

### 9. ARQUITETURA E EXECUÇÃO

ATENÇÃO: Este requisito é fundamental.

A aplicação web do Lovable não possui permissão nativa para clicar em outros programas do Windows ou capturar continuamente a tela de um jogo externo.

Portanto, implementar uma arquitetura com dois componentes:

**COMPONENTE 1: PAINEL WEB**

Desenvolvido no Lovable.

Responsável por:
- Interface.
- Configurações.
- Visualização dos bosses.
- Histórico.
- Comunicação com o agente local.

**COMPONENTE 2: AGENTE LOCAL WINDOWS**

Desenvolvido em Python.

Responsável por:
- Identificar a janela do jogo.
- Executar os dois cliques no RAID.
- Capturar a tela.
- Detectar alterações de cores.
- Identificar os bosses.
- Comunicar eventos ao painel.
- Enviar notificações ao Discord.

O agente deverá funcionar localmente no computador onde o Lineage 2 está aberto.

Criar um mecanismo simples para iniciar o agente e conectá-lo ao painel web.

Preferir comunicação local segura, sem expor portas desnecessariamente à internet.

O agente deverá possuir um arquivo de configuração próprio para armazenar parâmetros de calibração e o Webhook, sem deixar credenciais expostas no código-fonte.

### 10. REQUISITOS DE CONFIABILIDADE

- Não inventar alterações.
- Não enviar notificações quando não houver mudança real.
- Não depender de reconhecimento de texto isoladamente para detectar a cor.
- Não considerar uma falha de captura como alteração de estado.
- Não perder o estado anterior dos bosses entre ciclos.
- Registrar erros de captura e comunicação.
- Reconectar automaticamente ao agente quando possível.
- Não clicar em coordenadas incorretas se a janela do jogo não estiver identificada.
- Não executar cliques quando o jogo estiver fechado.
- Não enviar notificações repetidas para o mesmo estado.

Se a lista não estiver visível ou não puder ser identificada corretamente, o sistema deverá informar o problema no painel e aguardar uma nova tentativa.

### 11. ENTREGA OBRIGATÓRIA

Não entregar somente uma interface demonstrativa.

Implementar efetivamente:
- Painel web.
- Agente Windows.
- Captura real da tela.
- Interação real com o botão RAID.
- Detecção visual de alteração de cores.
- Integração funcional com Discord.

Criar instruções simples de instalação e execução no Windows 10/11.

Disponibilizar o agente local com seus arquivos necessários e um procedimento simples para iniciar o monitoramento.

**REGRA PRINCIPAL DO PROJETO:**

Se qualquer um dos 20 Raid Bosses mudar de cor na lista RAID do Lineage 2, o GUARDIAN RAID WATCH deverá identificar qual boss mudou e enviar imediatamente uma notificação ao Discord.

O objetivo é deixar o monitoramento funcionando em segundo plano enquanto o usuário joga, sem precisar ficar olhando constantemente para a lista de Raid Bosses.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://raid-boss.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aeacb13d-4964-4b3b-aad8-7a8fed880e94).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
