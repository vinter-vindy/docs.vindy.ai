---
title: Multi-tenancy
sidebar_label: Multi-tenancy
sidebar_position: 3
---

# Multi-tenancy

**Başka bir şirketin verisini görebilir misiniz? Hayır. Sizin verinizi de kimse göremez.**

Her API anahtarı tek bir şirkete aittir ve o anahtarın nelere erişebileceğini tek başına bu bağ belirler. Hiçbir "tenant" parametresi göndermezsiniz, hiçbir ayar yapmazsınız: Vindy her isteği sizin yerinize şirketinizle sınırlar.

Bunun pratikte üç sonucu vardır:

- Vindy'nin sizin için çalıştırdığı her sorgu kendi şirketinizin içinde kalır; bu yüzden bir liste ya da sorgu size ancak kendi çağrılarınızı, toplu aramalarınızı ve asistanlarınızı döndürebilir.
- Size ait olmayan bir şey istediğinizde (örneğin başka bir şirkete ait bir `call_id`), Vindy `404 RESOURCE_NOT_FOUND` yanıtı verir; bu, hiç var olmamış bir kimlik için vereceği yanıtın tıpatıp aynısıdır. Kaydın var olup olmadığını size hiçbir zaman söylemez; böylece şirketler arasında hiçbir bilgi sızmaz.
- Bu, "elimizden geleni yaparız" meselesi değildir. Sözleşmenin garanti edilen bir parçasıdır ve bunu güvence altına alan testlerimiz vardır.

## Pratikte ne anlama gelir?

| İsteğiniz | Aldığınız yanıt |
|---|---|
| Kendi çağrınız | Çağrı verisiyle birlikte `200` |
| Var olmayan bir çağrı kimliği | `404 RESOURCE_NOT_FOUND` |
| Başka bir şirkete ait bir çağrı kimliği | `404 RESOURCE_NOT_FOUND` ("var olmayan" ile aynı) |

Yani size ait olmayan bir çağrı, hiç oluşturulmamış bir çağrıyla tıpatıp aynı davranır:

```bash
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/019fb3a4-8b6d-7f33-a2e1-4c9f0b2d6e18/recording-url
```

```json
{
  "message": "Call not found.",
  "extensions": {
    "code": "RESOURCE_NOT_FOUND"
  }
}
```
