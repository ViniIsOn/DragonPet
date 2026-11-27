# Créditos e licenças

## Arte

Todas as imagens em `assets/art/` e `public/art/` foram **criadas para este projeto** a partir de prompts originais, usando a ferramenta de geração de imagens da Arena. Não copiamos personagens, cenários, logotipos, nomes nem recursos de Dragon Mania: A Lenda, Talking Tom ou qualquer outro jogo.

- `dragon-base-v2.png` — referência original do **Dragão Esmeralda**: corpo esguio, escamas em camadas, chifres de cobre, asas grandes com nervuras, cauda longa e olhos âmbar. A imagem de captura de tela enviada pelo usuário serviu apenas como referência geral de clima/luz de jogo de fantasia estilizada; nenhum personagem, desenho ou composição foi copiado.
- `dragon-v2-happy.png`, `dragon-v2-hungry.png`, `dragon-v2-sleepy.png`, `dragon-v2-affection.png`, `dragon-v2-playing.png`, `dragon-v2-sleeping.png` — variações geradas a partir dessa referência, mantendo proporções, cores e detalhes.
- `island-base.png` — ilha original com casa, pomar e lago.

A primeira proposta de dragão (mais arredondada e infantil) foi descartada a pedido do usuário e não faz mais parte do jogo.

As versões usadas pelo jogo estão em `public/art/*.webp` (WebP, fundo transparente nas poses do dragão). `assets/source/` guarda referências em maior qualidade para gerar novas poses. O script `scripts/prepare_art.py` documenta o processamento.

**Permissão:** você pode usar, adaptar e distribuir estas imagens como parte do DragonPet. Elas não foram obtidas de bancos de imagens de terceiros.

## Áudio

**Não há arquivos de música ou efeitos sonoros neste projeto.** A música de fundo e os efeitos (alimentar, brincar, carinho, pegar fruta, nascer, melhorar habitat) são **sintetizados em tempo real** com a Web Audio API em `src/game/audio.ts` — osciladores e envoltórios criados pelo código, com escala pentatônica suave. Portanto, são sons originais e não exigem licença de terceiros.

Isso também mantém o jogo leve: zero downloads de áudio e zero arquivos de sample. Se você adicionar músicas gravadas no futuro, registre aqui a fonte e a licença antes de incluí-las.

## Código e dependências

O código do jogo é original deste repositório. Dependências de código aberto usadas no build:

- Vite, TypeScript — MIT / Apache-2.0 (conforme os pacotes instalados).
- Capacitor Core, CLI, Android e plugins Local Notifications / Preferences — código aberto; consulte os arquivos de licença em `node_modules/` para os termos exatos da versão fixada.

Nenhum dado pessoal, senha ou chave está incluído no projeto.
