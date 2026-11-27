# DragonPet 🐉

Um jogo **original** de cuidar de dragões fofos em uma ilha acolhedora. Esta é a **primeira versão jogável (v0.1)**: um ovo, um dragão, cuidados, um minijogo, recursos, habitat, lembretes, áudio original e salvamento.

Nenhum personagem, imagem, som, nome ou outro recurso foi copiado de Dragon Mania: A Lenda, Talking Tom ou outros jogos. Veja [CREDITS.md](CREDITS.md).

## Por que essa tecnologia?

**Web (HTML + CSS + TypeScript + Vite) empacotada com Capacitor para Android.**

- **PC (Dell XPS L502X, Windows 10, 8 GB, Intel HD Graphics 3000):** o jogo usa DOM/CSS e apenas um canvas 2D simples no minijogo. Não há WebGL, motores 3D, sombras em tempo real nem filtros pesados. As artes foram convertidas para WebP (cerca de 70 KB por pose e 196 KB pela ilha). A NVIDIA continua sem uso — nada aqui depende dela.
- **Android (Moto G24 Power):** o mesmo código roda dentro do WebView via Capacitor, com plugins nativos apenas para notificações locais e salvamento. O projeto inclui ícone adaptativo Android original do Dragão Esmeralda e mipmaps para várias densidades.
- **Um só código:** o que melhora no PC melhora no celular, sem manter dois jogos separados.

Para jogar no PC você só precisa de um navegador moderno (Chrome, Edge ou Firefox). Para gerar o APK é preciso Node.js no computador e Android SDK no GitHub Actions.

## Como testar agora no PC

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (por exemplo `http://localhost:5173`). Na visualização desta conversa, use a prévia do servidor. Paratestar o build final:

```bash
npm run build
npm run preview
```

Também rode os testes da lógica de cuidados com `npm test`.

### Roteiro rápido de teste

1. Toque no ovo cerca de dez vezes até ele chocar.
2. Dê um nome ao dragão.
3. Alimente, faça carinho (também tocando no dragão), brinque e coloque para dormir.
4. Junte frutas e brilhos no **Pega-Frutas** e melhore o **Habitat**.
5. Abra **Configurações**, ajuste música/efeitos e o lembrete.
6. Recarregue a página: o progresso continua.

## Onde o progresso é salvo

- **No PC/navegador:** no `localStorage` deste navegador, neste dispositivo. Outro navegador ou modo anônimo começa do zero; limpar dados do site apaga o progresso.
- **No app Android:** no armazenamento privado do app, também separado do navegador. Jogar no PC e no celular cria **dois progressos independentes** — ainda não há sincronização entre eles.
- Chave interna: `dragonpet.save.v1`. Desinstalar o app apaga os dados dele.

Salvamento é automático após cada ação e ao abrir o jogo. O tempo passado enquanto o jogo estava fechado é aplicado com limite de 12 horas de desgaste: faltar um dia deixa o dragão com mais fome/sono, mas nunca apaga progresso nem aplica punição pesada.

## O que já funciona

- Ovo que aquece com toques e tempo, nascimento e nome.
- Um dragão original de fantasia estilizada (corpo esguio, escamas visíveis, chifres de cobre, asas grandes e cauda longa) com seis estados visuais: feliz, com fome, com sono, querendo carinho, brincando e dormindo.
- Quatro necessidades (saciedade, energia, alegria, carinho) que mudam com o tempo e com os cuidados.
- Alimentar, fazer carinho, brincar, dormir/acordar, com falas originais do dragão.
- Recursos (frutas e brilhos), fruteiras que regeneram com o tempo e habitat com 3 níveis e decoração visível.
- Minijogo **Pega-Frutas** (25 s, mouse/toque/setas) com recompensas.
- Dia de cuidado e sequência gentil, sem punição por falta.
- Livro de dragões com o primeiro amigo descoberto e outros "em breve".
- Música suave e efeitos **gerados por código** (Web Audio), com volumes separados e silenciar.
- Lembretes locais opcionais: após a eclosão, o jogo apresenta uma solicitação única para permitir notificações; só ativa após o usuário aceitar. Até 3 horários, frequência diária/segunda a sexta/a cada 6-12-24 h, silêncio durante partidas e desligamento total (detalhes abaixo).
- Salvamento local e interface responsiva para PC e celular.
- Ícone Android original do Dragão Esmeralda em variantes adaptativas e densidades mdpi a xxxhdpi.

## O que ainda NÃO está pronto

- **APK com o novo ícone:** compilado com sucesso no GitHub Actions; o artefato debug temporário exige login no GitHub para baixar. Nenhuma release pública foi criada. Veja [docs/ANDROID.md](docs/ANDROID.md).
- **Notificações com o app fechado:** o agendamento nativo está implementado e foi conferido no código do plugin (usa `AlarmManager` do Android), mas **a entrega real ainda não foi testada no seu Moto G24 Power** — não tenho aparelho/emulador aqui. Há um teste de 10 segundos dentro de Configurações para você validar. No navegador, o lembrete só funciona com a página aberta.
- Segundo dragão, crescimento de estágio (jovem/adulto), habitats adicionais, mais minijogos, batalhas amigáveis e sincronização entre dispositivos — próximas etapas.
- Não há contas, nuvem, anúncios, compras nem coleta de dados.

## Lembretes e sequência de cuidados

Em **Configurações → Lembretes do dragão** você escolhe até três horários, a frequência (todos os dias, segunda a sexta ou a cada 6/12/24 horas) e pode silenciar os lembretes enquanto joga o Pega-Frutas. Tudo pode ser desligado; ao desligar, os alarmes pendentes são cancelados. As mensagens são originais e carinhosas.

- **Navegador:** aparece como balão enquanto a aba estiver aberta; notificação do sistema apenas se você permitir. Não há service worker nem envio em segundo plano.
- **Android:** notificações locais agendadas pelo sistema. O plugin usa `AlarmManager`, `WAKE_LOCK` e `RECEIVE_BOOT_COMPLETED`, então o Android pode entregá-las com o app em segundo plano ou fechado — desde que o sistema não restrinja o app. O horário pode ser ajustado alguns minutos pelo modo Doze/fabricante. Use **Testar notificação em 10 s** e **Ver alarmes agendados** para conferir no seu aparelho.
- **Limites desta versão:** sem sobreposição de tela, sem interação com outros jogos/apps e sem notificações em nuvem.

A sequência de dias aumenta quando você cuida do dragão e recomeça gentilmente se passar um dia — sem perda de recursos.

## GitHub

Os arquivos deste projeto foram enviados para a branch `arena/9ddaf040-dragonpet` com autorização do usuário. Não há release pública, chaves, senhas ou dados pessoais no projeto.

## Estrutura

```
src/                  código do jogo (estado, áudio, minijogo, lembretes, interface)
public/art/           artes otimizadas usadas em jogo
assets/art/           artes originais geradas para o projeto
assets/source/        referências em alta qualidade
scripts/prepare_art.py  converte as artes para WebP com fundo transparente
scripts/prepare_android_icon.py  gera ícones Android nas densidades necessárias
android-res/            recursos versionados de ícone (projeto android/ é gerado)
tests/                testes da lógica de cuidados
docs/ANDROID.md       guia de APK e permissões
.github/workflows/    geração do APK sob demanda
```
