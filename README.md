# 🚌 Otobüs Oyunu — Web Sürümü (SvelteKit)

Unity'deki "Otobüs Oyunu" projesinin tarayıcıda oynanabilen, statik (SvelteKit + `adapter-static`) web versiyonu. Şeritler arasında geçiş yaparak trafikten kaçıyorsun; Shift/⚡ ile hızlanabilirsin.

## Yerelde çalıştırma (npm gerekli)

```bash
npm install
npm run dev
```

Sonra terminalde çıkan `http://localhost:5173` adresini tarayıcıda aç.

> Bu sandbox ortamının internet erişimi olmadığı için `npm install` burada çalıştırılamadı. Dosyalar hazır; kendi bilgisayarında (Node.js 18+ kurulu olmalı) yukarıdaki komutları çalıştırman yeterli.

## Statik build alma

```bash
npm run build
```

Çıktı `build/` klasörüne düşer — bu klasörü herhangi bir statik hosting'e (GitHub Pages, Netlify, Vercel, vs.) yükleyebilirsin.

## GitHub'a yükleme

```bash
git init
git add .
git commit -m "Otobüs Oyunu web sürümü"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/REPO_ADIN.git
git push -u origin main
```

## GitHub Pages ile yayınlama

1. `svelte.config.js` içindeki `base` değerini repo adına göre ayarla (repo adı `otobus-oyunu` ise `base: '/otobus-oyunu'`), ya da build alırken:
   ```bash
   BASE_PATH=/REPO_ADIN npm run build
   ```
2. `build/` klasörünün içeriğini `gh-pages` branch'ine push'la (ör. `gh-pages` paketiyle) veya Settings → Pages → "Deploy from a branch" ile `build` klasörünü kaynak göster.
3. Ayrıca basit bir GitHub Actions workflow'u ile de otomatik deploy edebilirsin (`actions/deploy-pages`).

## Visual Studio / VS Code'da çalıştırma

Bu proje artık Unity/C# değil, JavaScript (Svelte) tabanlı. Visual Studio yerine **VS Code** kullanman daha uygun olur:

1. Klasörü VS Code ile aç.
2. Terminalden `npm install` → `npm run dev`.
3. "Svelte for VS Code" eklentisini kurarsan `.svelte` dosyalarında syntax highlighting/otomatik tamamlama olur.

(İstersen Unity/C# scriptlerini de aynı repoya ayrı bir klasörde tutabilirsin — ikisi birbirini etkilemez.)

## Kontroller

| Tuş | Etki |
|---|---|
| ← / A | Sola şerit değiştir |
| → / D | Sağa şerit değiştir |
| Shift (basılı tut) | Hızlan (daha çok puan, daha riskli) |
| Boşluk / Enter | Başla / tekrar oyna |

Mobilde ekranın altındaki ◀ ⚡ ▶ butonları aynı işi yapar.

## Proje yapısı

```
src/
  app.html            → ana HTML kabuğu
  routes/
    +layout.js         → prerender ayarı (statik export için)
    +page.svelte       → oyunun tamamı (canvas motoru + arayüz)
svelte.config.js       → adapter-static yapılandırması
vite.config.js
```
