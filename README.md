# Cabe no Meu Bolso?

Um app simples para ver quanto sobra por dia até o próximo pagamento e testar como uma compra mudaria esse valor. A pessoa informa o que tem hoje, a data em que recebe de novo e as contas que ainda precisa pagar. O resultado mostra a consequência; a decisão de comprar é dela.

O projeto é **estático**: o código-fonte da interface e da calculadora já está em `dist/`, que também é a pasta pronta para publicação. Não há etapa de build, login, cadastro, banco de dados ou conexão bancária. Saldo, data, contas e última compra simulada ficam apenas no `localStorage` do navegador usado. Em um dispositivo compartilhado, use **Limpar meus dados** ao terminar.

## Executar localmente

Com Python 3 instalado, na raiz do projeto:

```bash
python3 -m http.server 8000 --directory dist
```

Abra `http://localhost:8000`. Em Windows, caso o comando seja `py`, use `py -m http.server 8000 --directory dist`. Não abra `index.html` por `file://`, pois os módulos JavaScript precisam de um servidor HTTP.

Para testar os cálculos e as interações, instale Node.js e execute `npm test`. O script usa o test runner nativo do Node; não há dependências para instalar.

## Publicar no Cloudflare Pages

1. No painel da Cloudflare, vá em **Workers & Pages → Criar → Pages → Conectar ao Git** e selecione este repositório.
2. Escolha a branch `main` para produção.
3. Nas configurações de build, deixe **comando de build vazio** e informe `dist` como **diretório de saída**. A raiz do projeto é a raiz do repositório.
4. Publique. O Pages servirá `dist/index.html` e os demais arquivos estáticos. Novos commits em `main` poderão gerar novas publicações pela integração Git.

Se a interface pedir um preset, escolha a opção sem framework/None. Não é necessário cadastrar variáveis de ambiente nem conectar banco. A disponibilidade da opção de integração Git depende das permissões concedidas à Cloudflare na sua conta GitHub.

## Google Analytics 4

O analytics vem **desligado**. Em `dist/analytics-config.mjs`, insira seu ID público do fluxo Web no formato `G-XXXXXXXXXX` em `GA_MEASUREMENT_ID`. Antes de ativar, siga os comentários desse arquivo: desative a Medição otimizada, coleta de dados fornecidos pelo usuário e Google Signals no GA4. Depois altere `PRIVACY_SETTINGS_CONFIRMED` para `true` e publique novamente. O app pede consentimento para estatísticas; sem ID, configuração confirmada e aceite, não carrega a tag.

Eventos comportamentais configurados:

| Evento | Ação |
| --- | --- |
| `page_view` | Visita à página |
| `click_calcular_agora` | Clique no CTA inicial |
| `simulation_started` | Início do preenchimento |
| `simulation_completed` | Cálculo concluído |
| `purchase_simulation_started` | Início de teste de compra |
| `purchase_simulation_completed` | Teste de compra concluído |
| `click_simular_outra_compra` | Testar outro valor |
| `click_refazer_tudo` | Reiniciar simulação |
| `click_limpar_dados` | Limpar dados locais |
| `quick_value_clicked` | Uso de um botão de valor rápido |
| `purchase_slider_used` | Uso do slider de compra |

Os eventos enviam apenas nomes fixos, nunca saldo, valores de contas, compra, nomes de contas ou data de pagamento. O GA4 pode coletar dados técnicos de visita e sessão após o aceite. Não adicione gravação de tela nem captura automática de formulários sem rever a privacidade.

## Estrutura

- `dist/index.html`, `dist/styles.css` e `dist/*.mjs`: código completo e arquivos a publicar.
- `tests/`: testes dos cálculos, armazenamento, analytics e interações.
- `package.json`: comando `npm test`.

Os exemplos automatizados incluem R$ 500 − R$ 200 em 10 dias (R$ 30/dia), compra de R$ 90 (R$ 21/dia), contas acima do saldo e compra acima do dinheiro livre.
