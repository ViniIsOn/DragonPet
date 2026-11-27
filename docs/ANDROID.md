# Como gerar, instalar e testar o APK no Android

## Situação atual

Este ambiente de trabalho **não tem Java nem Android SDK**, então **não consigo compilar nem testar o APK aqui**. O projeto Capacitor e o fluxo do GitHub Actions estão prontos; o APK só existe depois que o fluxo termina com sucesso. Qualquer link de download virá de um **Artifact do GitHub Actions** (build debug), nunca de uma release pública.

## Passo a passo

1. Faça o push da branch `arena/9ddaf040-dragonpet`.
2. No GitHub: **Actions → Build Android APK → Run workflow** (o fluxo é manual, para não gerar builds sem querer).
3. Quando o job terminar, baixe o artefato `DragonPet-APK-debug` e extraia o ZIP.
4. Copie `app-debug.apk` para o POCO M5s e abra o arquivo. O Android pedirá permissão para instalar fontes desconhecidas — normal para um APK de teste; permita apenas para o app usado para abrir o arquivo (gerenciador de arquivos ou navegador). **Não é necessário desativar o antivírus.**
5. Teste o jogo e os lembretes (roteiro abaixo). O APK é **debug**, assinado com a chave padrão do Gradle; publicar exigiria uma chave própria, não incluída por segurança.

## Permissões solicitadas

Conferi os manifestos do projeto gerado e do plugin `@capacitor/local-notifications@6.1.3`:

- `android.permission.INTERNET` — modelo padrão do Capacitor; o WebView carrega arquivos locais e o jogo não envia dados a servidores.
- `android.permission.POST_NOTIFICATIONS` (Android 13+) — pedida só quando você ativa os lembretes; se negar, o resto do jogo continua normal.
- `android.permission.WAKE_LOCK` e `android.permission.RECEIVE_BOOT_COMPLETED` — do plugin de notificações locais, para tentar entregar o lembrete no horário e após o celular ligar.

Não há `SYSTEM_ALERT_WINDOW` (sobreposição), nem permissão de câmera, microfone, localização, contatos ou arquivos. O app não interage com outros jogos, não tem anúncios, rastreadores nem notificações em nuvem.

## Lembretes: o que foi verificado e o que ainda depende do seu teste

**Verificado no código (não no aparelho):** o plugin agenda alarmes com `AlarmManager`; quando `allowWhileIdle` está ativo ele usa `setExactAndAllowWhileIdle` (Android 6+), e agendamentos com `at + repeats` usam `setRepeating`. O agendamento por dia da semana usa o casamento cron do plugin e é reagendado após cada entrega. Isso permite entrega com o app em segundo plano ou fechado, **respeitando Doze, otimizações de bateria do fabricante e permissões do sistema**. O horário pode chegar com alguns minutos de atraso.

**Não verificado aqui:** a entrega real no seu POCO M5s. Não tenho dispositivo nem emulador neste ambiente. Por isso o app traz ferramentas para você conferir:

1. Abra **Configurações → Lembretes do dragão** e ative os lembretes. Conceda a permissão de notificações quando o Android pedir.
2. Escolha frequência (diária, segunda a sexta ou a cada 6/12/24 h) e até três horários. Toque em **Ver alarmes agendados**: o painel mostra quantos alarmes o Android registrou.
3. Toque em **Testar notificação em 10 s**. Em seguida, troque para outro aplicativo ou feche o DragonPet da lista de apps recentes e espere. Se a notificação aparecer na área de notificações com o app fechado, o agendamento nativo está funcionando no seu aparelho.
4. Se não aparecer, verifique em **Configurações do Android → Aplicativos → DragonPet → Notificações** e nas opções de bateria/autoinício do MIUI (permitir execução em segundo plano). Isso é ajuste de bateria, não de antivírus.
5. **Silenciar durante partidas:** ao abrir o Pega-Frutas, os alarmes são cancelados e voltam a ser agendados quando você sai. No navegador, o balão de lembrete também fica suspenso durante a partida. Desligar os lembretes cancela todos os alarmes pendentes.

Mensagens são originais e carinhosas, personalizadas com o nome do dragão.

## Gerando localmente (opcional)

Se você instalar Android Studio + JDK 17 + SDK Platform 34 na sua máquina:

```bash
npm install
npm run build
npx cap add android      # somente na primeira vez
npx cap sync android
npx cap open android     # abre no Android Studio e roda no celular
```

O diretório `android/` é gerado e está no `.gitignore`; ele não precisa ser enviado ao GitHub.
