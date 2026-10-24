# Ömer için: Prompter'ı Mac'te kurma talimatı

Bu dosyayı kendin okuyarak uygulayabilir ya da olduğu gibi kendi kodlama ajanına (Claude Code vb.) verebilirsin. Adımlar sırayla yapılmalı.

## Prompter nedir

Ham promptu yazdığın bir masaüstü widget'ı. Promptu analiz edip uygun Claude 5.5 modelini ve effort seviyesini önerir, gerekirse birkaç soru sorar, sonra o model için optimize edilmiş, kopyalanmaya hazır promptu yazar. Arka planda optimizer olarak **Vertex AI üzerinden Gemini 4 Argon** çağırır. Electron + React + TypeScript. Windows'ta geliştirildi; **macOS'ta henüz hiç denenmedi**, ilk deneyen sensin.

## 1. Gereksinimler

- macOS, Node.js 22 veya üstü (`node -v` ile kontrol et; yoksa `brew install node`).
- Git ve bu private repoya erişim.
- Kendi Google Cloud hesabın (2. adım). **Uğur'un API key'i paylaşılmıyor; kendi key'ini oluşturacaksın.**

## 2. Kendi Vertex AI API key'ini oluştur

1. [Google Cloud Console](https://console.cloud.google.com)'da bir proje oluştur ya da var olanı seç. Projeye bir faturalama hesabı bağlı olmalı (yeni hesaplarda verilen ücretsiz deneme kredisi Gemini kullanımını karşılar).
2. **APIs & Services → Library** altında **Vertex AI API**'yi (`aiplatform.googleapis.com`) etkinleştir.
3. **APIs & Services → Credentials → Create credentials → API key** ile bir key oluştur. Güvenlik için key'i **Vertex AI API** ile kısıtla.
4. Proje ID'ni not al (Console'un üst kısmındaki proje seçicide yazar).

Ayrıntılar ve doğrulanmış model listesi: [docs/vertex-ai-gemini-kurulumu.md](docs/vertex-ai-gemini-kurulumu.md). O dosyadaki `the-curate` projesi Uğur'un; sen kendi proje ID'ni kullan.

## 3. Kurulum

```bash
git clone https://github.com/ugurshelby/prompter.git
cd prompter
npm install
cp .env.example .env
```

`.env` dosyasını aç ve kendi değerlerini yaz:

```env
VERTEX_API_KEY=<senin key'in>
VERTEX_PROJECT_ID=<senin proje ID'n>
VERTEX_LOCATION=global
```

- `VERTEX_LOCATION` mutlaka `global` kalsın: `gemini-4-argon` bölgesel uç noktalarda 404 veriyor.
- `.env` git'e girmez (`.gitignore`'da). Key'i kimseyle paylaşma, commit'leme.

`npm install` Electron'u indirmezse (npm'in script izinleri yüzünden olabilir) şunu çalıştır:

```bash
node node_modules/electron/install.js
```

## 4. Çalıştır ve doğrula

Önce arayüzü açmadan, motoru gerçek Vertex'e karşı test et:

```bash
npm run selftest
```

Çıktıda `ANALYSIS` ve `GENERATED` bölümleri görünmeli. `API key reddedildi` ya da `404` hatası alırsan 2. ve 3. adımları kontrol et.

Sonra uygulamayı aç:

```bash
npm run dev
```

- `Cmd+Shift+Space` pencereyi gösterir ya da gizler. Kısayol başka bir uygulamayla çakışırsa Ayarlar'dan değiştir.
- ✕ tuşu pencereyi menü çubuğundaki ikona gizler; çıkış o ikonun menüsünden ya da Ayarlar'dan yapılır.
- Ayarlar → "Bağlantıyı test et" key'in çalıştığını gösterir. Analiz ve yazım için başka Gemini modelleri de seçilebilir.

## 5. (İsteğe bağlı) Normal uygulama olarak kur

```bash
npm run dist:mac
```

`release/` altında bir `.dmg` oluşur. Uygulama imzasız olduğu için ilk açılışta Gatekeeper uyarır: Finder'da uygulamaya **sağ tık → Aç** de. Kurulu sürüm `.env`'i projeden değil `~/Library/Application Support/Prompter/.env` dosyasından okur; ya `.env`'i oraya kopyala ya da key'i Ayarlar'dan gir (macOS Keychain ile şifreli saklanır).

## 6. Mac'te dikkat edilecekler (geri bildirim ver)

Bunlar Windows'ta doğrulandı ama Mac'te hiç denenmedi; sorun görürsen Uğur'a yaz:

- Şeffaf, çerçevesiz pencere ve köşe yuvarlamaları.
- Menü çubuğu ikonu (`resources/trayTemplate.png`) ve Dock'ta görünmeme.
- Her zaman üstte kalma (tam ekran uygulamaların üstünde de).
- Küçültülmüş küre modunda sürükleme ve kenara yapışma.

## Proje haritası

- `src/main/` — Electron ana süreci: pencere, tray, kısayol, Vertex istemcisi (`gemini.ts`), motor (`engine/`), geçmiş (`history.ts`).
- `src/renderer/` — React arayüzü.
- `knowledge/` — optimizer'ın kullandığı bilgi kartları. Düzenlediğin kart bir sonraki istekte kullanılır.
- `docs/` — kaynak dokümanlar. Ayrıntılı bilgi için [README.md](README.md) ve [PLAN.md](PLAN.md).
