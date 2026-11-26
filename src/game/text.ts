import type { Emotion } from './types.ts';

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: 'Feliz',
  hungry: 'Com fome',
  sleepy: 'Com sono',
  affection: 'Querendo carinho',
  playing: 'Brincando',
  sleeping: 'Dormindo',
};

export const LINES: Record<string, string[]> = {
  happy: ['Hoje o céu tem cheiro de fruta madura!', 'Estou feliz de estar aqui com você.', 'Olha só, minhas asas estão brilhando!'],
  hungry: ['Hmm... será que sobrou uma frutinha?', 'Meu barriguinha está pedindo atenção.', 'Acho que eu poderia comer uma ou duas… com carinho.'],
  sleepy: ['Bocejo… desculpe, fiquei sonolento.', 'Acho que um cochilo faria bem.', 'Meus olhos estão ficando pesados…'],
  affection: ['Um abraço bem apertado? Só se quiser!', 'Chega mais perto, eu guardo um lugar pra você.', 'Seu carinho deixa minhas escamas quentinhas.'],
  playing: ['Mais uma vez! Mais uma vez!', 'Peguei! Peguei a fruta!', 'Brincar com você é o meu favorito.'],
  sleeping: ['zzz… sonhando com nuvens de algodão…', 'Estou descansando. Obrigado por cuidar de mim.', 'zzz…'],
  feed: ['Nham! Essa fruta é doce de verdade!', 'Obrigado pelo lanche, foi ótimo!', 'Hummm… guardei um pedacinho pra depois.'],
  cuddle: ['Ahhh… você é o melhor amigo do mundo.', 'Faz assim de novo, por favor?', 'Estou ronronando por dentro!'],
  sleep: ['Boa noite. Cuide bem dos sonhos pra mim.', 'Vou fechar os olhinhos agora…'],
  wake: ['Bom dia! Dormi muito bem!', 'Acordei com vontade de brincar!'],
  hatch: ['Oi! Eu sou você? Quero dizer… eu sou eu!', 'Olá, mundo! Que lugar bonito!'],
  upgrade: ['A ilha ficou ainda mais aconchegante!', 'Agora tem mais cantinhos pra brincar!'],
  reward: ['Você pegou frutas demais! Vamos dividir?', 'Que diversão! Ganhamos brilhos juntos!'],
  reminder: [
    'Oi! Estou com saudades — que tal um carinho rápido?',
    'A ilha está tranquila… eu fiquei pensando em você.',
    'Lembrei de você enquanto olhava as nuvens!',
    'Se der, passe aqui pra dizer oi. Só isso já alegra meu dia.',
    'Estou esperando você com uma frutinha separada.',
  ],
};

export function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? '';
}
