# Prompter — Plan (taslak v1)

## Amaç

Ham promptu yaz → Prompter hedef **model + effort** önersin (ya da senin seçtiğini kullansın) → gerekirse önce netleştirme soruları sorsun → o model/effort için resmî dokümanlara dayanarak optimize edilmiş, kopyalanmaya hazır promptu versin. Windows + macOS'ta çalışan, her zaman üstte durabilen, küçültülebilen bir masaüstü widget'ı.

Kapsam sırası (hedef modeller): Claude 5.5 ailesi → Gemini → GPT.

## İki rol

| Rol | Ne | v1 |
|---|---|---|
| **Optimizer** | Promptu yeniden yazan model (Prompter'ın çağırdığı tek model) | **Gemini 4 Argon**, Vertex AI, API key |
| **Hedef model** | Promptun yazıldığı model (sen kopyalayıp oraya verirsin) | Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 (+ Fable 5.1, karar 1) |

Prompter Claude'u hiç çağırmaz; Claude yalnızca hedeftir. Claude bilgisi, `knowledge/` kartları üzerinden Gemini'ye bağlam olarak verilir.

## Mimari

| Katman | Seçim (öneri) | Not |
|---|---|---|
| Uygulama kabuğu | **Electron + electron-vite + React/TypeScript** | Makinede Rust/MSVC derleme araçları olmadığı için Tauri yerine seçildi (24 Ekim 2026). Always-on-top, tray, global kısayol, autostart yerleşik. Bedeli: daha büyük kurulum ve RAM. |
| Optimizer sağlayıcısı | Ana süreçte `src/main/gemini.ts` | Vertex Gemini, düz HTTPS. İstekler ve API key ana süreçte kalır, arayüze inmez. |
| Hedef model profilleri | `src/shared/catalog.ts` + `knowledge/targets/*.md` | Model ID, fiyat, varsayılan effort (API / Claude Code), hedef araç ayar notu. |
| Kimlik bilgisi saklama | `.env` ya da Electron `safeStorage` | Arayüzden girilen key, OS şifrelemesiyle (Windows DPAPI / macOS Keychain) `userData/vertex.key` dosyasına yazılır. |
| Yerel veri | `userData/*.json` | Ayarlar, pencere konumu ve geçmiş (`history.json`, en fazla 200 kayıt). |

## Vertex AI bağlantısı (Gemini)

- **Kimlik:** Vertex AI API key, `x-goog-api-key` başlığıyla. (Claude'un Vertex'teki `rawPredict` uç noktası API key kabul etmiyor; bu yüzden optimizer'ın Gemini olması kimlik işini basitleştiriyor.)
- **Uç nokta:** `https://aiplatform.googleapis.com/v1/projects/{PROJE}/locations/global/publishers/google/models/{model}:generateContent`, stream için `:streamGenerateContent?alt=sse`. Projesiz yol `gemini-4-argon` için 404 veriyor (bkz. [vertex-ai-gemini-kurulumu.md](docs/vertex-ai-gemini-kurulumu.md)).
- **Model ID:** `gemini-4-argon`, Prompter'dan gerçek istekle doğrulandı (24 Ekim 2026). Analiz ve yazım modeli ayarlardan ayrı ayrı değiştirilebilir.
- **Structured output:** `responseMimeType: application/json` + `responseSchema`.

## Optimizer akışı

1. **Analiz** — ham prompt + hedef yüzey → görev tipi, belirsizlikler, öneri `{model, effort, gerekçe}`, gerekiyorsa `questions` (1–3 kısa soru).
2. **Netleştirme** — soru varsa widget'ta gösterilir; cevaplarsın (ya da "atla" dersin).
3. **Üretim** — seçilen/önerilen model+effort'un kartıyla yeniden yazım. Çıktı: `optimized_prompt` (İngilizce), `changes` (ne değişti, neden), hedef araçta yapılacak ayar notu (model/effort).

Optimize edilen prompt **İngilizce** üretilir; senin dilinde yanıt istiyorsan prompta "Respond in Turkish" eklenir.

## Bilgi tabanı (`knowledge/`)

Rehberinden ve `docs/platform/`'dan damıtılmış kısa kartlar. Ham dokümanlar uygulamaya gömülmez; kartlar optimizer'ın system talimatına girer.

- `general.md` — best practices, tutarlılık, halüsinasyon, uzun bağlam
- `targets/claude-opus-5-5.md`, `targets/claude-sonnet-5-5.md`, `targets/claude-haiku-5-5.md` (+ `targets/claude-fable-5-1.md`)
- `effort-matrix.md` — dokümanlardaki effort tavsiyeleri tablo halinde (ör. Sonnet 5.5: iyi tanımlı agentic coding → `medium`, zor/uzun → `high`, sohbet → `low/medium`; Opus 5.5 varsayılanı `medium`; Haiku 5.5 kısa işler → `low`)
- `surfaces/claude-code.md`, `surfaces/chat.md`, `surfaces/api-system-prompt.md` — üslup ve ayar notları

## Arayüz

- **Modlar:** Pill (kenara yapışan küçük buton) ↔ Kompakt (girdi + sorular + sonuç + Kopyala) ↔ Tam (ayarlar, geçmiş, şablonlar).
- **Pencere:** pin (always-on-top) aç/kapa, serbest sürükleme, kenara snap, şeffaflık, konum/boyut hatırlama (çoklu monitör), tray ikonu, global kısayol ile göster/gizle, açılışta başlat (opsiyonel).
- **Seçiciler:** hedef yüzey (Claude Code / sohbet / API), hedef model (Auto veya elle), effort (Auto veya elle).

## Aşamalar

| Faz | İçerik | Durum |
|---|---|---|
| F0 | Electron iskeleti; widget davranışları (pin, pill, hotkey, tray); ayar ekranı (API key, model ID) | Yapıldı |
| F1 | Gemini Vertex bağlantısı: test çağrısı, streaming, structured output | Yapıldı |
| F2 | Bilgi tabanı kartları ve effort matrisi (`knowledge/`) | İlk sürüm |
| F3 | Optimizer akışı: analiz → sorular → üretim; öneri arayüzü; kopyala | Yapıldı |
| F4 | Geçmiş (yapıldı: `userData/history.json`, kopyala / yeniden yaz / aç / sil); şablonlar ve docs senkron script'i | Kısmen |
| F5 | Paketleme: Windows NSIS kurulum, macOS `.dmg` (`electron-builder.yml` hazır) | Denenmedi |
| Sonra | Hedef olarak Gemini ve GPT; Antigravity yüzeyi | |

## Verilen kararlar

- Optimizer: Gemini 4 Argon, Vertex AI API key ile.
- Prompt dili: İngilizce.
- v1 yüzeyleri: Claude Code, claude.ai/Desktop sohbet, API/system prompt.
- Belirsiz prompt: önce 1–3 soru sorar.

## Açık kararlar (öneriyle ilerlenebilir)

1. **Fable 5.1** hedef listede (öneriyle uygulandı): yalnızca sınırda zor ya da çok uzun işler için önerilir.
2. **Dağıtım:** yalnızca kişisel kullanım, imzasız (öneri; Windows SmartScreen ve macOS Gatekeeper uyarısı bir kez geçilir) mı, başkalarına dağıtım mı (Apple Developer + Windows kod imzalama)?
3. **macOS build:** elinde Mac var mı, yoksa GitHub Actions macOS runner mı?
4. **v1 ekstraları:** seçili metni kısayolla alıp optimize etme, sonucu aktif pencereye otomatik yapıştırma. Öneri: F4 sonrasına.

## Kaynaklar

- Kendi rehberin: [docs/claude-5-5-prompting-rehberi.md](docs/claude-5-5-prompting-rehberi.md)
- Resmî dokümanların yerel kopyası (69 sayfa): [docs/platform/INDEX.md](docs/platform/INDEX.md)
