# Vertex AI üzerinden Gemini (Argon) kullanımı — kurulum ve bağlam

> Lyrica'da 22–23 Ekim 2026'da kurulup gerçek isteklerle doğrulandı. Aynı API key ile başka bir projede (ör. Prompter) Gemini modellerini çağırmak için gereken her şey burada. API key'in kendisi bu metinde yok ve hiçbir dosyaya, loga ya da istemci koduna yazılmamalı.

## Kısa özet

| | |
|---|---|
| Kimlik | Vertex AI **API key**, `x-goog-api-key` başlığıyla. OAuth / Bearer token / service account gerekmiyor. |
| Proje | `the-curate` (proje numarası `567754594524`) |
| Konum | **`global`** |
| Uç nokta | `https://aiplatform.googleapis.com/v1/projects/{PROJE}/locations/global/publishers/google/models/{MODEL}:generateContent` |
| Stream | Aynı yol, `:streamGenerateContent?alt=sse` |
| Varsayılan model | `gemini-4-argon` |
| İstemci | SDK yok; düz HTTPS POST + JSON |

**En önemli tuzak:** Projesiz yol (`https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL}:generateContent`) çoğu Gemini modelinde çalışıyor ama istek arka planda `us-central1` ya da `europe-west4` gibi bir bölgeye düşüyor ve **`gemini-4-argon` orada yok → 404**. Argon'u ve tüm modelleri aynı şekilde çağırmak için her zaman `projects/the-curate/locations/global/...` yolunu kullan. (Prompter'ın `PLAN.md`'sindeki uç nokta bu yüzden düzeltilmeli.)

## Ortam değişkenleri

```env
VERTEX_API_KEY=<Google Cloud Console → APIs & Services → Credentials altındaki key>
VERTEX_PROJECT_ID=the-curate
VERTEX_LOCATION=global
```

- Key yalnızca sunucu / çekirdek tarafında okunur. Lyrica'da Next.js API route'larında (Node runtime), Prompter'da Rust çekirdeğinde ya da OS anahtarlığında (Windows Credential Manager / macOS Keychain) durmalı; arayüze (React/webview) asla inmemeli.
- Lyrica'da `.env.local` git dışında.

## Doğrulanmış modeller (23 Ekim 2026)

Model listeleme uç noktası API key ile çalışmıyor (401/404). Modeller tek tek çağrılarak doğrulandı.

| Model | Durum | Not |
|---|---|---|
| `gemini-4-argon` | ✓ | En güçlü. Yalnızca `global` yolunda. Düşünme tokenı raporlamıyor. Kısa istek ~6–10 sn, büyük bağlamlı JSON çıktısı ~30–60 sn. |
| `gemini-3.1-pro-preview` | ✓ | Yazmadan önce düşünür (`thoughtsTokenCount` ~650–1500); kısa istekte ~10–20 sn. |
| `gemini-3.8-flash` | ✓ | En yeni Flash, 1M giriş / 64k çıkış. Ara sıra **429** veriyor. |
| `gemini-3.7-flash` | ✓ | Bölgesel yolda 429 görüldü, global'de çalıştı. |
| `gemini-3.6-flash`, `gemini-3.5-flash` | ✓ | |
| `gemini-3.5-flash-lite` | ✓ | En hızlı (~2 sn), düşünme yok. |
| `gemini-3-flash-preview` | ✓ | |
| `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` | ✓ | Eski nesil. |
| `gemini-3-pro-preview`, `gemini-3.5/3.7/3.8-pro`, `gemini-2.0-*`, `gemini-1.5-*` | ✗ 404 | Yok ya da kaldırılmış. |

Partner modeller (Claude, Llama vb.) kullanılmadı: Google Cloud Marketplace üzerinden faturalanıyorlar ve kredi kapsamına girip girmedikleri doğrulanmadı. Google'ın kendi modelleri aşağıdaki kredilerden düşüyor.

## İstek

```http
POST https://aiplatform.googleapis.com/v1/projects/the-curate/locations/global/publishers/google/models/gemini-4-argon:generateContent
Content-Type: application/json
x-goog-api-key: <VERTEX_API_KEY>
```

```json
{
  "systemInstruction": { "parts": [{ "text": "Sen ... (sistem talimatı)" }] },
  "contents": [
    { "role": "user", "parts": [{ "text": "Kullanıcının isteği" }] }
  ],
  "generationConfig": {
    "temperature": 0.8,
    "topP": 0.95,
    "maxOutputTokens": 32768,
    "responseMimeType": "application/json",
    "responseSchema": { "...": "aşağıya bak" }
  }
}
```

- Çok turlu sohbet için `contents` dizisine `{"role":"model", ...}` ve `{"role":"user", ...}` sırayla eklenir.
- Düz metin istiyorsan `responseMimeType: "text/plain"` ver ve `responseSchema`yı gönderme.

## Yanıt

```json
{
  "candidates": [
    {
      "content": { "role": "model", "parts": [{ "text": "..." }] },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 352,
    "candidatesTokenCount": 97,
    "thoughtsTokenCount": 651,
    "totalTokenCount": 1100
  },
  "modelVersion": "gemini-4-argon"
}
```

- Metni almak için `candidates[0].content.parts` içindeki `text` alanlarını birleştir; `thought: true` olan parçaları at.
- `finishReason`:
  - `MAX_TOKENS` → yanıt yarım, hata say.
  - Metin boşsa `finishReason` ve `promptFeedback.blockReason` alanlarını logla.

## Structured output (`responseSchema`)

Argon ve 3.1 Pro'da test edildi, çalışıyor. Şema OpenAPI alt kümesi; tip adları **büyük harf**:

```json
{
  "type": "OBJECT",
  "properties": {
    "plan":   { "type": "STRING", "description": "Önce düşünülecek şey" },
    "result": { "type": "STRING" },
    "score":  { "type": "NUMBER", "description": "0 ile 1 arası", "minimum": 0, "maximum": 1 },
    "tags":   { "type": "ARRAY", "items": { "type": "STRING" } }
  },
  "required": ["plan", "result", "score", "tags"],
  "propertyOrdering": ["plan", "result", "score", "tags"]
}
```

- Kullanılabilen alanlar: `type` (`OBJECT`, `ARRAY`, `STRING`, `NUMBER`, `INTEGER`, `BOOLEAN`), `properties`, `required`, `items`, `enum`, `minimum`, `maximum`, `description`, `propertyOrdering`.
- **`propertyOrdering`** alanların üretim sırasını belirler. "Önce plan, sonra çıktı" gibi bir akış istiyorsan plan alanını başa koy.
- Sayısal aralıkları `description` içinde de yaz. Aralık belirtilmeyince 3.1 Pro 0–1 yerine 0–10 döndürdü.
- Yine de savunmalı parse et:
  1. Kod bloğu işaretlerini (```` ```json ````) temizle.
  2. İlk `{` ile son `}` arasını al.
  3. JSON geçersizse isteği bir kez tekrarla.

## Stream (SSE)

```
POST .../publishers/google/models/gemini-4-argon:streamGenerateContent?alt=sse
```

Yanıt `data: {...}` satırları olarak gelir. Her satır, `generateContent` yanıtıyla aynı yapıda bir parça taşır (`candidates[0].content.parts[].text`); parçaları sırayla birleştir. Global yolda argon ile doğrulandı. Prompter'da "yazılıyor" hissi için kullanışlı; ama `responseSchema`'lı JSON çıktısında parçalar tamamlanmadan parse edilemez.

## Hata ve dayanıklılık

| Durum | Ne yapmalı |
|---|---|
| `404 ... was not found or your project does not have access` | Yanlış yol ya da model ID. `projects/the-curate/locations/global/...` kullan; model ID'yi tablodan kontrol et. |
| `429 Resource exhausted` | Özellikle Flash modellerinde ara sıra oluyor. Artan beklemeyle 2 kez tekrar (Lyrica: 1.5 sn, 6 sn). |
| `5xx` | Aynı tekrar politikası. |
| Uzun süren istek | Büyük bağlamlı (20k+ token) JSON istekleri 1–6 dakika sürebiliyor; Lyrica'da 240 sn sonra zaman aşımına düşen istekler oldu. Zaman aşımını 180–240 sn tut, kullanıcıya süre göster. |
| `MAX_TOKENS` | `maxOutputTokens` düşünme tokenlarını da kapsar. 4096 gibi düşük değerler yanıtı keser; 32768 kullan. |
| Yarım içerik ama `STOP` | Model ara sıra uzun bir alanı (ör. tam metin) yarıda bitiriyor. İçeriğin tamamlandığını kendi kontrolünle doğrula, gerekiyorsa bir kez tekrar iste. |
| Latin dışı harf kaçağı | Nadiren çıktıya Korece/Arapça harf karışıyor ("K세diler"). Regex ile denetle: `/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u`; varsa yalnızca o satırları düzelttir ya da tekrar iste. |

## Kod: TypeScript (Lyrica'daki istemcinin sadeleştirilmiş hali)

```ts
const ENDPOINT = (project: string, location: string, model: string) =>
  `https://${location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`}` +
  `/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

export async function gemini(opts: {
  model?: string;
  system: string;
  user: string;
  schema?: object;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const key = process.env.VERTEX_API_KEY!;
  const project = process.env.VERTEX_PROJECT_ID ?? "the-curate";
  const location = process.env.VERTEX_LOCATION ?? "global";
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      topP: 0.95,
      maxOutputTokens: 32768,
      responseMimeType: opts.schema ? "application/json" : "text/plain",
      ...(opts.schema ? { responseSchema: opts.schema } : {}),
    },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 180_000);
    try {
      const res = await fetch(ENDPOINT(project, location, opts.model ?? "gemini-4-argon"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1) ** 2));
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(`Vertex ${res.status}: ${data?.error?.message}`);
      const c = data.candidates?.[0];
      if (c?.finishReason === "MAX_TOKENS") throw new Error("Yanıt token sınırında kesildi");
      const text = (c?.content?.parts ?? [])
        .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
        .map((p: { text: string }) => p.text)
        .join("")
        .trim();
      if (!text) throw new Error(`Boş yanıt (${c?.finishReason ?? data?.promptFeedback?.blockReason})`);
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Vertex: tekrar denemeleri tükendi");
}
```

Lyrica'daki tam hali: `src/lib/ai/vertex-client.ts` (tekrar deneme, JSON ayrıştırma, `generateJson` yardımcı fonksiyonu) ve `src/lib/ai/models.ts` (model kataloğu).

## Kod: Rust (Prompter / Tauri çekirdeği için)

`Cargo.toml`: `reqwest = { version = "0.12", features = ["json", "rustls-tls"] }`, `serde_json = "1"`, `tokio` (Tauri'de zaten var).

```rust
use serde_json::{json, Value};
use std::time::Duration;

pub async fn gemini(
    api_key: &str,
    project: &str,
    model: &str,
    system: &str,
    user: &str,
    schema: Option<Value>,
) -> Result<String, String> {
    let url = format!(
        "https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/publishers/google/models/{model}:generateContent"
    );
    let mut generation_config = json!({
        "temperature": 0.7,
        "topP": 0.95,
        "maxOutputTokens": 32768,
        "responseMimeType": if schema.is_some() { "application/json" } else { "text/plain" }
    });
    if let Some(s) = schema {
        generation_config["responseSchema"] = s;
    }
    let body = json!({
        "systemInstruction": { "parts": [{ "text": system }] },
        "contents": [{ "role": "user", "parts": [{ "text": user }] }],
        "generationConfig": generation_config
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    for attempt in 0..3u64 {
        let res = client
            .post(&url)
            .header("x-goog-api-key", api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = res.status();
        if (status.as_u16() == 429 || status.is_server_error()) && attempt < 2 {
            tokio::time::sleep(Duration::from_millis(1500 * (attempt + 1).pow(2))).await;
            continue;
        }
        let data: Value = res.json().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            return Err(format!("Vertex {}: {}", status, data["error"]["message"]));
        }
        let cand = &data["candidates"][0];
        if cand["finishReason"] == "MAX_TOKENS" {
            return Err("Yanıt token sınırında kesildi".into());
        }
        let text: String = cand["content"]["parts"]
            .as_array()
            .map(|parts| {
                parts
                    .iter()
                    .filter(|p| p["thought"] != true)
                    .filter_map(|p| p["text"].as_str())
                    .collect()
            })
            .unwrap_or_default();
        if text.trim().is_empty() {
            return Err(format!("Boş yanıt ({})", cand["finishReason"]));
        }
        return Ok(text.trim().to_string());
    }
    Err("Vertex: tekrar denemeleri tükendi".into())
}
```

## Hızlı test

Bash:

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $VERTEX_API_KEY" \
  "https://aiplatform.googleapis.com/v1/projects/the-curate/locations/global/publishers/google/models/gemini-4-argon:generateContent" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Bir cümleyle merhaba de."}]}],"generationConfig":{"maxOutputTokens":200}}'
```

PowerShell (key'i ekrana basmadan `.env.local`'dan okur):

```powershell
$k = ((Get-Content .env.local | Where-Object { $_ -match '^VERTEX_API_KEY=' }) -replace '^VERTEX_API_KEY=','').Trim('"',"'",' ')
$body = '{"contents":[{"role":"user","parts":[{"text":"Bir cumleyle merhaba de."}]}],"generationConfig":{"maxOutputTokens":200}}'
Invoke-RestMethod -Method Post -Headers @{ "x-goog-api-key" = $k } -ContentType "application/json" -Body $body `
  -Uri "https://aiplatform.googleapis.com/v1/projects/the-curate/locations/global/publishers/google/models/gemini-4-argon:generateContent"
```

Bir modelin erişilebilir olup olmadığını öğrenmenin tek yolu bu çağrıyı o model ID'siyle yapmak: 200 → var, 404 → yok ya da yanlış yol.

## Kredi ve fatura

- Faturalama hesabı `the-curate` projesine bağlı. 22 Ekim 2026 itibarıyla:
  - Free Trial: ~₺13.9k kaldı, 18 Aralık 2026'da bitiyor.
  - Google Developer Program kredileri: ₺489 ve ₺481.
- Google'ın kendi Gemini modelleri bu kredilerden düşüyor.
- Partner modeller (Claude vb.) Marketplace üzerinden faturalanıyor ve kredi kapsamı doğrulanmadı; kullanılmadı.
- Kullanım `usageMetadata` içindeki token sayılarından izlenebilir; Lyrica her yanıtta bunları döndürüyor.
- Kota ve kredi durumu: Google Cloud Console → Billing → Credits.

## Lyrica'dan dersler (Prompter için de geçerli)

- **Uzun kural listeleri:** Kaliteyi "doğru ama ruhsuz" yapabiliyor. Lyrica'da modele madde madde kural vermek yerine "nasıl baktığımızı" anlatan bir vizyon metni ve gerçek örnekler vermek daha iyi sonuç verdi.
- **Model jürisi:** Bir modeli başka bir modelle (LLM-as-judge) puanlatmak yanıltıcı olabilir. Jüri, insanın beğenisini değil, kendi beğenisini ödüllendirdi. Kalite kararını kullanıcının kendisi vermeli.
- **Ayrıştırılan alanlar:** `responseSchema` ile istenen her alanı (plan, gerekçe, çıktı) arayüzde göstermek, modelin ne yaptığını anlamayı kolaylaştırdı.
