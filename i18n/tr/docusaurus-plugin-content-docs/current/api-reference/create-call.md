---
title: Çağrı Oluştur
sidebar_label: Çağrı Oluştur
sidebar_position: 5.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls`

**Tek** bir giden çağrı başlatır. [`POST /v1/calls/bulk`](bulk-create-calls.md)'ın aksine toplu arama oluşturmaz; dolayısıyla `batch_call_id` dönmez. Tek seferlik çağrılar (tek bir hatırlatma, tek bir geri arama) için bunu, aynı anda çok sayıda kişiyi aramak için bulk'u kullanırsınız.

Çağrı kuyruğa alınır ve arka planda (asenkron) dağıtılır; istek içinde senkron bir arama yapılmaz. Yanıt, çağrının `call_id` değerini döndürür; bu kimlikle çağrıyı [izler](get-call.md) ya da [iptal edersiniz](cancel-call.md).

---

## İstek

```http
POST https://api.vindy.ai/v1/calls
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "phone_number": "+905551112233",
  "variables": { "first_name": "Elif", "appointment_time": "14:30" },
  "metadata": { "order_id": "ORD-4821" },
  "scheduled_at": "2026-06-10T09:00:00+03:00"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `assistant_id` | string (UUID) | **Zorunlu.** Çağrıyı hangi yapay zeka asistanının yürüteceğini bu alanda belirtirsiniz; müşteriyle görüşmeyi o asistan gerçekleştirir. Asistanın kimliğini [`GET /v1/assistants`](list-assistants.md) listesinden alırsınız. |
| `phone_number_id` | string (UUID) | **Zorunlu.** Vindy müşteriyi aradığında müşterinin telefonunda görünecek numarayı (arayan numaranızı) bu alanda belirtirsiniz. Bu numarayı [`GET /v1/phone-numbers`](list-phone-numbers.md) listesinde yer alan numaralar arasından seçersiniz. |
| `phone_number` | string | **Zorunlu.** Aranacak numarayı tam uluslararası **E.164** biçiminde bu alana yazarsınız (ör. `+905551112233`). Ayrıntılar için bkz. aşağıdaki [Telefon numaraları](#phone-numbers). |
| `variables` | object \| null | Asistanın bu çağrıda söylediğini kişiye göre değiştirmek istediğinizde bu alanı kullanırsınız. Asistanın metnindeki her `{{yer_tutucu}}` ifadesinin yerine, gönderdiğiniz değeri (ör. `{ "first_name": "Elif" }`) Vindy yerleştirir; böylece karşılama ve prompt kişiye adıyla hitap eder. `metadata` çağrıyı hiç etkilemezken, `variables` **asistanın söylediğini değiştirir**. Sınırlar için bkz. [Değişkenler](#variables). |
| `metadata` | object \| null | Bu çağrıya kendinize ait verileri iliştirmek için bu alanı kullanırsınız (ör. `{ "order_id": "ORD-4821" }`). Vindy bu veriyi hiçbir şekilde okumaz; çağrıyı her okuduğunuzda size olduğu gibi geri döndürür, böylece sonucu kendi kaydınızla eşleştirirsiniz. Sınırlar için bkz. [Metadata](#metadata). |
| `scheduled_at` | ISO 8601 datetime \| null | Çağrıyı hemen değil de **ileri** bir zamanda başlatmak isterseniz bu alanı kullanırsınız (ör. `2026-06-10T09:00:00+03:00`). Boş bırakırsanız çağrı, kapasite elverdiğince en kısa sürede kuyruğa alınır. Değeri, saat dilimi offset'i içeren bir ISO 8601 tarih-saat biçiminde gönderirsiniz. Ayrıntılar için bkz. [Zamanlama](#scheduled-at). |

### Telefon numaraları {#phone-numbers}

Numarayı tam uluslararası **E.164** biçiminde verirsiniz: baştan `+`, sonra ülke kodu, sonra abone numarası (ör. `+905551112233`). Yaygın ayraçlar (boşluk, tire, parantez ve nokta) tolere edilip temizlenir; bu yüzden `+90 555 111 22 33` de kabul edilir. `+`'dan sonra toplam 8 ile 15 arası hane bulunmalıdır; daha kısa ya da daha uzun olan reddedilir.

| Gönderdiğiniz | Sonuç |
|---|---|
| `+905551112233` | `+905551112233` — kabul |
| `+90 555 111 22 33` | `+905551112233` — ayraçlar temizlenir |
| `+441632960000` | `+441632960000` — kabul |
| `+12` | **Reddedilir** — 8 haneden az |
| `05551112233` | **Reddedilir** — `400 INVALID_PHONE_NUMBER` (baştan `+` yok) |
| `5551112233` | **Reddedilir** — baştan `+` yok |

**Hiçbir ülkeye özel normalizasyon yoktur.** Baştan `+` olmayan bir numara **`400 INVALID_PHONE_NUMBER`** ile reddedilir. Kabul edilen numaralar normalize edilmiş biçimde saklanır ve aranır; bu normalize değeri yanıtta `phone_number` olarak, çağrıda ise (liste, tekil çağrı ve webhook yanıtlarında) `call_phone_number` olarak görürsünüz.

### Değişkenler {#variables}

`variables`, asistanın **çağrı sırasında** kullandığı **şablon değerleridir**. Asistanın prompt'unda ya da karşılama (greeting) metninde bir `{{name}}` yer tutucusu nerede geçerse, Vindy çağrı başlamadan önce `name` için gönderdiğiniz değeri oraya yerleştirir. Böylece `"Merhaba {{first_name}}, {{appointment_time}} için bir hatırlatmadır"` gibi bir karşılama bu çağrıya özel kişiselleştirilir.

Bu, `metadata`'nın tam tersidir: `metadata` opaktır ve **çağrıyı asla etkilemez**, oysa `variables` **asistanın söylediğini değiştirir**. Asistanın söylemesi gereken her şey için `metadata` değil `variables` gönderirsiniz.

Bir asistanın hangi adları beklediği, prompt ve karşılama metnindeki `{{…}}` ifadelerinden türetilerek [`GET /v1/assistants`](list-assistants.md) yanıtının `assistant_variables` alanında listelenir. Vermediğiniz bir yer tutucu **boş** bırakılır; yani konuşmaya hiçbir zaman `{{…}}` sızmaz. Değerler **yalnızca skalerdir**; iç içe nesne ya da dizi içermez:

| Limit | Değer | Örnek |
|---|---|---|
| En fazla anahtar | 50 | 51 anahtarlı bir nesne reddedilir |
| En fazla anahtar uzunluğu | 40 | `first_name` uygundur; 41 karakterlik bir anahtar reddedilir |
| En fazla değer uzunluğu | 500 | 600 karakterlik bir değer reddedilir |
| Değer tipleri | `string`, `number`, `boolean` (sayılar/boolean'lar string'e çevrilir) | `{ "count": 3 }` konuşmada `3` olarak seslendirilir; `{ "paid": true }` ise `true` olarak |
| İç içe nesne / dizi / `null` | İzin verilmez | `{ "order": { "id": 1 } }` ve `{ "note": null }` reddedilir |

Bir `variables` anahtarı boş olamaz (1–40 karakter). Kural ihlali **`400 INVALID_VARIABLES`** döndürür.

### Metadata {#metadata}

`metadata`, tamamen **size ait** olan serbest biçimli bir anahtar-değer nesnesidir. Vindy onu opak bir veri olarak ele alır: içeriğini **asla okumaz, ayrıştırmaz, doğrulamaz ya da ona göre işlem yapmaz** ve çağrının nasıl başlatıldığına, yönlendirildiğine veya işlendiğine **hiçbir etkisi yoktur**. Vindy onu yalnızca saklar ve o çağrının her görünümünde size değiştirmeden geri döndürür: [`GET /v1/calls/:callId`](get-call.md), [`POST /v1/calls/list`](list-calls/index.md) ve [webhook olaylarında](webhooks.md) görürsünüz.

Tek görevi **sizin tarafınızda eşleştirmedir**. Çağrıyı kendi verinizle ilişkilendirmek için sistemlerinizin ihtiyaç duyduğu kimlikleri iliştirirsiniz: bir CRM kişi kimliği, bir sipariş numarası ya da kendi istek kimliğiniz gibi. Sonuç geri geldiğinde aynı anahtarları `call_metadata` içinden okur ve sonucu doğrudan kendi CRM'inize, veritabanınıza veya iş akışınıza yönlendirirsiniz; ayrıca bir telefon-numarası–kayıt eşleme tablosu tutmanıza gerek kalmaz.

`variables`'ın aksine `metadata` **yapılandırılmış** olabilir: değerler skaler olabileceği gibi iç içe nesne ve dizi de olabilir; böylece kendi kayıtlarınızın şeklini birebir yansıtırsınız. Tek kısıtlama yapısaldır; bu sayede Vindy veriyi güvenilir biçimde saklayıp geri döndürür:

| Limit | Değer | Örnek |
|---|---|---|
| Değer tipleri | `string`, `number`, `boolean`, `null` ve iç içe nesne/dizi | `{ "orderId": "ORD-4821", "qty": 2, "paid": true, "note": null, "items": ["a", "b"] }` geçerlidir |
| Nesne başına en fazla anahtar | 50 (üst düzey ve her iç içe nesne) | 51 anahtarlı bir nesne reddedilir |
| En fazla anahtar uzunluğu | 40 | `crm_contact_id` (14 karakter) uygundur; 41 karakterlik bir anahtar reddedilir |
| En fazla string değer uzunluğu | 500 | 600 karakterlik bir string değer reddedilir |
| En fazla iç içe derinlik | 5 | `{ "a": { "b": { "c": { "d": 1 } } } }` sınırdadır; bir düzey daha derini reddedilir |
| En fazla toplam giriş | 200 (tüm skalerler ve kapsayıcılar birlikte) | nesne genelinde 250 değer reddedilir |
| En fazla serileştirilmiş boyut | 32 KB (JSON, UTF-8) | 40 KB'a serileşen bir yük reddedilir |

Kural ihlali **`400 INVALID_METADATA`** döndürür.

:::caution Kendi anahtarlarınız için kullanın, PII koymayın
Vindy `metadata`'yı asla yorumlamadığı için burası **sizin** eşleştirme anahtarlarınızın doğru yeridir (ör. `crm_contact_id`, `orderId`, `campaign`). Kişisel veriler (ad, telefon, kimlik numarası) için **uygun değildir**; onları kendi sistemlerinizde tutun ve buraya yalnızca anahtarla referans verin.
:::

### `scheduled_at` ile zamanlama {#scheduled-at}

Varsayılan olarak çağrı hemen kuyruğa alınır. İleri bir zamana ertelemek için `scheduled_at`'i **timezone offset içeren bir ISO 8601 / RFC 3339 tarih-saat** olarak gönderin:

| Biçim | Örnek | Ne zaman tetiklenir |
|---|---|---|
| Sayısal offset (önerilen) | `2026-06-10T09:00:00+03:00` | İstanbul'da 09:00 (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 İstanbul |

**Offset'i her zaman ekleyin.** Offset'siz (naive) bir değer (ör. `2026-06-10T09:00:00`) yerel saat değil **UTC** kabul edilir; yani tahmin ettiğinizden üç saat sonra, İstanbul'da 12:00'de tetiklenir. İstanbul'da 09:00 için `2026-06-10T09:00:00+03:00` gönderin.

- Zamanlar **UTC** olarak saklanır ve karşılaştırılır; API'nin diğer yerlerindeki zaman damgaları UTC (`+00:00`) döner.
- **Gelecek-zaman doğrulaması yok:** geçmiş bir zaman, çağrıyı bir sonraki dağıtım döngüsünde (≈hemen) başlatılmak üzere kuyruğa alır. Hemen aramak için `scheduled_at`'i hiç göndermeyin.
- Toplu aramanın aksine, tek bir çağrı bir mesai penceresiyle **bekletilmez**; zamanı geldiğinde (hemen ya da `scheduled_at`'te) başlatılır.
- Geçerli bir ISO 8601 tarih-saat olmayan değer (ör. `10.06.2026`, `now`) **`400 VALIDATION_FAILED`** ile reddedilir.

## Yanıt (201 Created)

```json
{
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "phone_number": "+905551112233"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string (UUID) | Bu çağrının kalıcı kimliğidir. [`GET /v1/calls/:callId`](get-call.md) ile durumunu sorgular, kuyruktayken [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile iptal edersiniz. |
| `phone_number` | string | Vindy'nin arayacağı numaranın normalize edilmiş E.164 biçimidir; gönderdiğiniz numara ayraçlarından temizlenip standart hâle getirilmiş olarak döner. |

## Hatalar

| Durum | Kod |
|---|---|
| `400` | `VALIDATION_FAILED` (zorunlu alan eksik), `INVALID_PHONE_NUMBER`, `INVALID_VARIABLES`, `INVALID_METADATA`, `PHONE_NUMBER_NOT_USABLE` |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `404` | `ASSISTANT_NOT_FOUND`, `PHONE_NUMBER_NOT_FOUND` |
| `429` | `RATE_LIMITED` |

`PHONE_NUMBER_NOT_FOUND`: `phone_number_id` bilinmiyor, bozuk ya da şirketinize ait değil; `PHONE_NUMBER_NOT_USABLE`: numara var ama giden aramaya hazır değil.

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "phone_number": "+905551112233"
  }'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const res = await fetch("https://api.vindy.ai/v1/calls", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    assistant_id: "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    phone_number_id: "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    phone_number: "+905551112233",
  }),
});
const { call_id } = await res.json();
console.log(call_id);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os, requests

res = requests.post(
    "https://api.vindy.ai/v1/calls",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    json={
        "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
        "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
        "phone_number": "+905551112233",
    },
)
print(res.json()["call_id"])
```

</TabItem>
</Tabs>
