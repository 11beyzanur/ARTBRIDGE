# ÜRÜN GEREKSİNİM BELGESİ (PRD): ARTBRIDGE

## 1. Projenin Amacı ve Özeti
**ARTBRIDGE**, yaratıcı endüstrilerdeki (sanat ve tasarım) eğitim ve sektör arasındaki kopukluğu gideren, veriye dayalı üç taraflı bir web platformudur. 

* **Problem:** Sanat ve tasarım dünyasında yetenek değerlendirmesinin tamamen sübjektif (kişisel zevklere dayalı) olması ve genç yeteneklerin sektörle doğru şekilde buluşamaması.
* **Çözüm:** Portfolyoların çift körleme (anonim) yöntemiyle, sektör profesyonelleri tarafından objektif metriklerle puanlandığı; şirketlerin ise bu doğrulanmış verilerle en doğru yeteneği bulabildiği, yeteneği ölçülebilir kılan bir ekosistem yaratmak.

---

## 2. Kullanıcı Tipleri ve Rolleri (Kimin İçin Yapıyoruz?)
Sistemde birbirini besleyen 3 ana aktör bulunmaktadır:

1. **Öğrenciler / Yeni Mezunlar (B2C - Üretici):** Güzel sanatlar/tasarım öğrencileri veya junior kreatifler. Sisteme portfolyo yükler, objektif puanlar ve geri bildirimler alarak gelişimlerini takip ederler.
2. **Değerlendiriciler / Viewers (Arz Sağlayıcı / Kalite Kontrol):** Sektörde en az 5 yıl deneyimli art direktörler, tasarımcılar ve akademisyenler. Sisteme yüklenen işleri anonim olarak inceler, puanlar ve yorumlarlar.
3. **İşverenler / Galeriler (B2B - Tüketici / Ana Gelir Kaynağı):** Reklam ajansları, oyun stüdyoları ve sanat galerileri. İhtiyaçlarına en uygun, yeteneği kanıtlanmış ve filtrelenmiş genç kreatifleri keşfedip işe alırlar.

---

## 3. Temel Özellikler ve Kullanıcı Akışları (Sistem Nasıl Çalışacak?)

### A. Portfolyo Yükleme ve Değerlendirme Akışı
* **Yükleme:** Öğrenci; eserini yükler, disiplinini (örn: 3D Animasyon, İllüstrasyon), kullandığı tekniği ve okul bilgilerini girer.
* **Çift Körleme (Double-Blind) Eşleşme:** Sistem, bu eseri o disiplindeki bir Viewer'ın önüne düşürür. Öğrenci ve uzman birbirinin kim olduğunu bilmez. Odak sadece işin kalitesidir.
* **Puanlama Kriterleri:** Viewer eseri 1-10 arası bir skalada 3 temel kritere göre puanlar:
  1. *Kavramsal Tutarlılık*
  2. *Teknik Yeterlilik*
  3. *Özgünlük*
* **İki Katmanlı Geri Bildirim Sistemi:** * *Özel Yorum:* Öğrenciye özel, detaylı, yapıcı ve özgür eleştiri.
  * *Genel Özet:* Öğrencinin profilinde sergilenebilecek paylaşılabilir kısa özet.

### B. Öğrenci Profil ve Gelişim Sistemi
* **Gelişim Takibi ve Öğrenme İvmesi (Learning Agility):** Sistem, öğrencinin sadece anlık işini değil, zaman içindeki gelişimini ve eleştirileri uygulama hızını (örn: ortalama 2 hafta) grafiksel veri olarak sunar.
* **Sosyal Ekosistem:** "Career-Ready" sertifika ilerleme çubuğu, profil kartları ve onaylı yorumları dışarıda paylaşma imkanı.

### C. İşveren (B2B) Keşif ve Filtreleme Modülü
* **İşveren Akıllı Filtreleme:** İşverenler disiplin, teknik yeterlilik puanı, puan aralığı ve "Career-Ready" statüsüne göre detaylı yetenek araması yapabilir.

---

## 4. Gelir Modeli ve Finansal Akışlar (Monetization)

| Kullanıcı Tipi | Plan / Kazanç Tipi | Ücretlendirme & Detay |
| :--- | :--- | :--- |
| **B2C (Öğrenci)** | Abonelik | Aylık 149,90 TL. |
| **B2B (İşveren)** | Standart Paket | Aylık 2.500 TL (Adayın anlık puanlarını/profilini gösterir). |
| **B2B (İşveren)** | Enterprise Paket | Aylık 5.000 TL (6 aylık gelişim grafiği ve öğrenme hızı verisi). |
| **Viewers** | İnceleme Başına Kazanç | 80 TL (İsteğe bağlı olarak platforma bağışlanabilir). |
| **Viewers** | Masterclass Satışı | %80 Viewer komisyonu, %20 Platform kesintisi. |
| **Diğer** | Ekstra Hizmetler | Sertifikasyon ücretleri, B2B ilan öne çıkarma, güvenli işlem bedelleri. |

---

## 5. Teknik Altyapı ve Mimari Gereksinimler

* **Mobil Uyumluluk (Responsive) ve PWA:** Uygulama "Mobile-First" yaklaşımıyla geliştirilecektir. Tüm ekran boyutlarında kusursuz çalışacak ve Progressive Web App (PWA) standartlarını destekleyerek mobil cihazlara uygulama gibi yüklenebilecektir.
* **Sunucu ve Altyapı:** Amazon Web Services (AWS) bulut altyapısı.
* **Ödeme Sistemi:** Iyzico ödeme sistemi entegrasyonu (abonelik ve pazar yeri yetenekleri için).
* **Geleceğe Hazırlık (Yapay Zeka & Veri Madenciliği):** Gelecekte eklenecek veri madenciliği ve moderasyon algoritmaları için arka planda Python (Django/FastAPI gibi) tabanlı sağlam bir yapı kurulmalıdır. Ön yüz (Frontend) için React veya Vue.js gibi modern bir kütüphane tercih edilmelidir.

---

## 6. Geliştirme Fazları (Yol Haritası)

1. **Faz 1 (MVP - Minimum Çalışan Ürün):** Portfolyo yükleme, çift körleme değerlendirme, temel puanlama algoritmaları ve Iyzico B2C entegrasyonu.
2. **Faz 2 (B2B ve Şirket Girişleri):** İşveren paneli, akıllı filtreleme, öğrenme ivmesi (learning agility) grafikleri ve Enterprise/Standart paket satışları.
3. **Faz 3 (Ölçeklenme ve AI):** Masterclass modülü, AI destekli otomatik içerik moderasyonu ve gelişmiş büyük veri (Big Data) analizleri.