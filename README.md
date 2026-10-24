# Prompter

Ham promptunu yazarsın; Prompter onu analiz edip uygun Claude 5.5 modelini ve effort seviyesini önerir, gerekirse birkaç soru sorar, sonra seçilen model ve effort için optimize edilmiş, kopyalanmaya hazır promptu yazar. Optimizer olarak Vertex AI üzerinden Gemini 4 Argon kullanılır.

## Kurulum (normal uygulama olarak)

```bash
npm run dist:win
```

`release/Prompter Setup <sürüm>.exe` dosyasını çalıştır. Prompter `%LOCALAPPDATA%\Programs\Prompter` altına kurulur; Başlat menüsünde ve masaüstünde kısayolu olur. Bilgisayar açılınca kendiliğinden başlasın istiyorsan Ayarlar → Pencere → "Oturum açılışında başlat".

- Kurulu sürüm Vertex ayarlarını `%APPDATA%\Prompter\.env` dosyasından ya da Ayarlar'dan kaydedilen şifreli key'den okur. Projedeki `.env` dosyasını okumaz.
- Bilgi kartları kurulum klasörüne kopyalanır. Projede `knowledge/` altında yaptığın değişiklikler, `dist:win` ile yeniden paketleyip kurana kadar kurulu sürüme yansımaz. Kurulum, eski sürümün üzerine yazar; ayarlar ve geçmiş korunur.

## Geliştirme

```bash
npm install
npm run dev
```

- Key `.env` dosyasından (`VERTEX_API_KEY`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`) ya da Ayarlar'dan girilip şifreli saklanan key'den okunur. Key arayüze hiç inmez.
- `Ctrl+Shift+Space` (macOS'ta `Cmd+Shift+Space`) pencereyi gösterir ya da gizler. Kapat düğmesi pencereyi tray'e gizler; çıkış tray menüsünden ya da Ayarlar'dan yapılır.
- Başlıktaki saat simgesi geçmişi açar. Her analiz bir kayıt olarak saklanır, o analizden yapılan her yazım da aynı kayda eklenir. Kayıtlar `%APPDATA%/Prompter/history.json` (macOS: `~/Library/Application Support/Prompter/`) içinde tutulur, en fazla 200 tane. Listeden tek tıkla son promptu kopyalayabilir, aynı model ve effort ile yeniden yazdırabilir ya da kaydı açabilirsin.
- Başlıktaki raptiye her zaman üstte kalmayı açıp kapatır. Küçült düğmesi paneli sürüklenebilir bir küreye çevirir; küreye tıklayınca panel geri açılır.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme modu (sıcak yenileme) |
| `npm run selftest -- "prompt"` | Arayüz açmadan analiz + yazımı gerçek Vertex'e karşı çalıştırır |
| `npm run typecheck` | Tip kontrolü |
| `npm run icons` | `resources/` altındaki ikonları yeniden üretir |
| `npm run dist:win` / `dist:mac` | Kurulum paketi (`release/`) |

Arayüzü Electron olmadan, sahte verilerle tarayıcıda geliştirmek için: `npx vite --config vite.mock.config.ts`.

## Yapı

- `src/main/` — Electron ana süreci: pencere/tray/kısayol, Vertex istemcisi (`gemini.ts`), motor (`engine/analyze.ts`, `engine/generate.ts`)
- `src/renderer/` — React arayüzü
- `src/shared/` — model kataloğu, tipler
- `knowledge/` — optimizer'ın kullandığı bilgi kartları. Her istekte diskten okunur; düzenlediğin kart bir sonraki istekte geçerli olur.
- `docs/` — kaynak dokümanlar (resmî Claude dokümanlarının yerel kopyası, rehber, Vertex kurulumu)
