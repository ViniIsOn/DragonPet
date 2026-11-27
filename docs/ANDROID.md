# Android: ícone, APK e testes

## Ícone do DragonPet

O ícone aprovado usa a arte original do Dragão Esmeralda, com rosto em destaque, escamas verdes, chifres acobreados, olhos âmbar e fundo verde-azulado. A fonte está em `assets/art/dragonpet-icon.png`.

Os recursos nativos ficam em `android-res/` (o diretório gerado `android/` permanece ignorado pelo Git):

- Ícones legados e variantes redondas em `mdpi` 48 px, `hdpi` 72 px, `xhdpi` 96 px, `xxhdpi` 144 px e `xxxhdpi` 192 px.
- Ícone adaptativo Android 8+ (`mipmap-anydpi-v26`) e camadas de primeiro plano nas densidades 108, 162, 216, 324 e 432 px.
- Cor de fundo coordenada com a arte, definida em `values/ic_launcher_background.xml`.

O workflow copia esses recursos ao projeto Android gerado **depois** de `npx cap sync android`, para que o sync não os substitua. Para regenerar os PNGs depois de editar a arte, execute `python3 scripts/prepare_android_icon.py` em um ambiente com Pillow; isso não é necessário para o workflow, pois os PNGs gerados estão versionados.

## Compilação e instalação

O workflow manual [Build Android APK](../.github/workflows/build-apk.yml) compila em GitHub Actions com JDK 17 e Android SDK 34 e publica um artefato debug temporário por 30 dias. Ele não cria uma release. O artefato de Actions exige que você esteja conectado ao GitHub para baixar.

1. Abra **Actions → Build Android APK → Run workflow** e escolha a branch que contém a versão desejada.
2. Aguarde o job concluir com sucesso; só então o artefato `DragonPet-APK-debug` estará disponível.
3. Baixe o ZIP do artefato, extraia `app-debug.apk` e transfira/abra no Moto G24 Power.
4. Se o Android pedir, permita temporariamente instalações dessa fonte (navegador ou Arquivos). Depois da instalação, você pode retirar a permissão. **Não é necessário desativar o antivírus.**

O APK é de depuração, assinado com a chave debug do Gradle. Não é uma versão da Play Store nem um APK de produção. Uma release pública ou assinatura de produção exigiria aprovação separada.

## Permissões

O manifesto inclui `INTERNET` (requisito do WebView local), `POST_NOTIFICATIONS` (Android 13+, ao ativar lembretes), `WAKE_LOCK` e `RECEIVE_BOOT_COMPLETED` (plugin de notificações locais). Não há `SYSTEM_ALERT_WINDOW`, câmera, microfone, localização, contatos ou anúncios/rastreadores.

## Notificações: verificação e teste no aparelho

O código do plugin foi verificado estaticamente: agenda alarmes nativos e tenta reagendá-los após a inicialização. O Android e as otimizações de bateria do fabricante podem atrasar ou suprimir entregas.

**A entrega real ainda não foi testada no Moto G24 Power.** Depois de instalar e abrir o app:

1. Vá a **Configurações → Lembretes do dragão**, ative os lembretes e conceda a permissão quando solicitada.
2. Toque em **Testar notificação em 10 s** e, em seguida, mude para outro app ou remova o DragonPet da lista de recentes. Não use **Forçar parada** para esse teste.
3. Se não chegar, confira as permissões de notificação e bateria do DragonPet nas configurações do Android. Não é necessário desativar o antivírus.

As notificações não sobrepõem outros apps nem interagem com outros jogos. O teste com o app fechado depende do resultado no próprio telefone.

## Compilar localmente (opcional)

Com Android Studio, JDK 17 e Android SDK Platform 34 instalados:

```bash
npm ci
npm run build
npx cap add android      # somente na primeira vez
npx cap sync android
cp -R android-res/. android/app/src/main/res/
cd android && ./gradlew assembleDebug
```

O diretório `android/` é gerado e está no `.gitignore`; os recursos versionados de ícone vivem em `android-res/`.
