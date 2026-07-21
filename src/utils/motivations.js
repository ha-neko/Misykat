import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'motivation_favorites';

const MOTIVATIONS = [
  {
    key: 'pekerjaan',
    label: 'Pekerjaan',
    sub: [
      {
        key: 'semangat',
        label: 'Semangat Kerja',
        items: [
          {
            id: 'kerja-1',
            title: 'Niat Karena Allah',
            quote: '"Sesungguhnya amal itu tergantung niatnya, dan setiap orang hanya mendapatkan sesuai niatnya."',
            source: 'HR. Bukhari & Muslim',
            content: 'Bekerja bukan sekadar mencari nafkah. Jadikan setiap pekerjaan sebagai ibadah dengan meluruskan niat karena Allah. Dengan niat yang benar, pekerjaan yang biasa pun menjadi bernilai pahala di sisi-Nya. Jangan pernah remehkan kekuatan niat – ia bisa mengubah rutinitas menjadi ladang pahala.',
          },
          {
            id: 'kerja-2',
            title: 'Bekerja Itu Ibadah',
            quote: '"Barangsiapa di waktu sore merasa lelah karena bekerja, maka di waktu sore itu dosanya diampuni."',
            source: 'HR. Thabrani',
            content: 'Kelelahan setelah bekerja bisa menjadi penghapus dosa jika diniatkan untuk mencari rezeki halal bagi keluarga. Maka janganlah mengeluh dengan lelahnya bekerja, karena Allah melihat dan menghargai setiap tetes keringat yang keluar demi mencari nafkah yang halal.',
          },
          {
            id: 'kerja-3',
            title: 'Profesionalitas',
            quote: '"Sesungguhnya Allah mencintai seseorang yang apabila bekerja, ia bekerja secara profesional (itqan)."',
            source: 'HR. Baihaqi',
            content: 'Bekerja secara profesional dan teliti adalah bentuk kecintaan kepada Allah. Itqan berarti melakukan pekerjaan dengan sempurna, penuh tanggung jawab, dan hasil terbaik. Jadilah pribadi yang bisa dipercaya dan memberikan manfaat melalui pekerjaanmu.',
          },
        ],
      },
      {
        key: 'rezeki',
        label: 'Rezeki',
        items: [
          {
            id: 'rezeki-1',
            title: 'Allah Maha Pemberi Rezeki',
            quote: '"Dan barangsiapa bertakwa kepada Allah, niscaya Dia akan membukakan jalan keluar baginya, dan memberinya rezeki dari arah yang tidak disangka-sangka."',
            source: 'QS. Ath-Thalaq: 2-3',
            content: 'Jangan pernah khawatir tentang rezeki. Allah yang Maha Hidup lagi Maha Berdiri Sendiri telah menjamin rezeki setiap makhluk-Nya. Tugas kita hanya berusaha dan bertakwa. Sisanya, Allah yang mengurus. Percayalah, rezeki tidak akan tertukar.',
          },
          {
            id: 'rezeki-2',
            title: 'Keberkahan Rezeki',
            quote: '"Dan Allah menghalalkan jual beli dan mengharamkan riba."',
            source: 'QS. Al-Baqarah: 275',
            content: 'Rezeki yang halal meskipun sedikit lebih baik daripada rezeki yang haram meskipun banyak. Karena rezeki halal membawa keberkahan, sementara rezeki haram hanya membawa kesenangan sesaat dan masalah berkepanjangan. Jagalah kehalalan rezeki keluarga.',
          },
          {
            id: 'rezeki-3',
            title: 'Bersyukur Atas Rezeki',
            quote: '"Sesungguhnya jika kamu bersyukur, pasti Aku akan menambah (nikmat) kepadamu."',
            source: 'QS. Ibrahim: 7',
            content: 'Bersyukur adalah kunci bertambahnya rezeki. Bukan hanya rezeki materi, tapi juga kesehatan, ketenangan hati, dan kebahagiaan keluarga. Lihatlah ke bawah dalam urusan dunia agar hatimu selalu bersyukur. Syukur membuka pintu keberkahan.',
          },
        ],
      },
      {
        key: 'keikhlasan',
        label: 'Keikhlasan',
        items: [
          {
            id: 'ikhlas-1',
            title: 'Ikhlas Kunci Ketenangan',
            quote: '"Padahal mereka tidak disuruh kecuali supaya menyembah Allah dengan memurnikan ketaatan kepada-Nya dalam (menjalankan) agama dengan lurus."',
            source: 'QS. Al-Bayyinah: 5',
            content: 'Keikhlasan adalah rahasia antara hamba dengan Tuhannya. Jika engkau ikhlas dalam bekerja, maka tekanan dan beban akan terasa ringan. Karena engkau tidak bekerja untuk pujian manusia, tetapi untuk ridha Allah. Ikhlas membuat hati tenang dan pikiran jernih.',
          },
          {
            id: 'ikhlas-2',
            title: 'Lelah Yang Berpahala',
            quote: '"Tidaklah seorang Muslim menanam tanaman atau bercocok tanam, lalu dimakan oleh burung, manusia atau binatang, melainkan itu menjadi sedekah baginya."',
            source: 'HR. Bukhari & Muslim',
            content: 'Setiap kebaikan yang engkau lakukan dalam pekerjaan, yang memberikan manfaat kepada orang lain, akan menjadi pahala bagimu. Maka jangan pernah merasa sia-sia dalam berbuat baik. Allah tidak akan menyia-nyiakan amal hamba-Nya walau sebesar biji sawi.',
          },
        ],
      },
    ],
  },
  {
    key: 'keluarga',
    label: 'Keluarga',
    sub: [
      {
        key: 'suami',
        label: 'Untuk Suami',
        items: [
          {
            id: 'suami-1',
            title: 'Pemimpin Yang Baik',
            quote: '"Kaum laki-laki itu adalah pemimpin bagi kaum perempuan."',
            source: 'QS. An-Nisa: 34',
            content: 'Menjadi pemimpin keluarga bukanlah tentang kekuasaan, melainkan tentang tanggung jawab. Suami yang baik adalah yang melayani keluarganya, memberikan nafkah lahir dan batin, serta menjadi teladan dalam kebaikan. Rasulullah adalah contoh terbaik suami yang lembut dan penyayang terhadap keluarganya.',
          },
          {
            id: 'suami-2',
            title: 'Sayangi Keluargamu',
            quote: '"Sebaik-baik kalian adalah yang paling baik terhadap keluarganya, dan aku adalah yang paling baik terhadap keluargaku."',
            source: 'HR. Tirmidzi',
            content: 'Ukuran kebaikan seorang suami bukan dari seberapa besar hartanya, tetapi dari bagaimana ia memperlakukan keluarganya. Senyuman untuk istri, bantuan dalam pekerjaan rumah, waktu bermain dengan anak-anak — semua itu adalah amal saleh yang dicintai Allah.',
          },
        ],
      },
      {
        key: 'istri',
        label: 'Untuk Istri',
        items: [
          {
            id: 'istri-1',
            title: 'Istri Shalehah',
            quote: '"Perempuan yang baik adalah untuk laki-laki yang baik."',
            source: 'QS. An-Nur: 26',
            content: 'Istri shalehah adalah perhiasan dunia yang paling berharga. Ia adalah madrasah pertama bagi anak-anaknya, pengelola rumah tangga yang amanah, dan penyejuk hati suami. Jadilah istri yang selalu bersyukur, sabar, dan mendukung kebaikan dalam keluarga.',
          },
          {
            id: 'istri-2',
            title: 'Kunci Surga',
            quote: '"Apabila seorang wanita melaksanakan shalat lima waktu, berpuasa Ramadhan, menjaga kemaluannya, dan menaati suaminya, maka dikatakan kepadanya: Masuklah ke surga dari pintu mana saja yang engkau kehendaki."',
            source: 'HR. Ahmad',
            content: 'Ketaatan kepada suami dalam kebaikan adalah jalan utama menuju surga bagi seorang istri. Bukan ketaatan buta, tetapi ketaatan yang penuh cinta dan saling pengertian. Jadilah istri yang cerdas, yang bisa menjadi mitra suami dalam membangun keluarga sakinah.',
          },
        ],
      },
      {
        key: 'ibu',
        label: 'Untuk Ibu',
        items: [
          {
            id: 'ibu-1',
            title: 'Kasih Ibu Tanpa Batas',
            quote: '"Dan Kami perintahkan kepada manusia agar berbuat baik kepada kedua orang tuanya. Ibunya telah mengandungnya dalam keadaan lemah yang bertambah-tambah."',
            source: 'QS. Luqman: 14',
            content: 'Ibu mengandung dengan susah payah, melahirkan dengan pertaruhan nyawa, menyusui dengan penuh cinta. Jasa ibu tidak akan pernah bisa terbalaskan. Maka hormatilah ibumu, sayangilah ia, dan jangan pernah membuatnya menangis karena sikapmu.',
          },
          {
            id: 'ibu-2',
            title: 'Doa Ibu Mustajab',
            quote: '"Ridha Allah tergantung pada ridha orang tua, dan murka Allah tergantung pada murka orang tua."',
            source: 'HR. Tirmidzi',
            content: 'Doa ibu adalah senjata yang paling ampuh untuk kesuksesan anak-anaknya. Jika engkau ingin sukses dunia akhirat, maka raihlah ridha ibumu. Karena di bawah telapak kaki ibulah surga itu berada. Jangan sia-siakan kesempatan untuk berbakti selama ibu masih ada.',
          },
        ],
      },
      {
        key: 'anak',
        label: 'Untuk Anak',
        items: [
          {
            id: 'anak-1',
            title: 'Amanah Terindah',
            quote: '"Harta dan anak-anak adalah perhiasan kehidupan dunia."',
            source: 'QS. Al-Kahfi: 46',
            content: 'Anak adalah amanah dari Allah yang harus dijaga dan dididik dengan baik. Mereka adalah investasi akhirat yang paling berharga. Setiap kebaikan yang mereka lakukan karena didikan kita akan terus mengalir pahalanya, bahkan setelah kita tiada.',
          },
          {
            id: 'anak-2',
            title: 'Didik Dengan Cinta',
            quote: '"Muliakanlah anak-anakmu dan perbaikilah pendidikan mereka."',
            source: 'HR. Ibnu Majah',
            content: 'Anak bukanlah kertas kosong yang bisa ditulis sesuka hati, melainkan benih yang perlu dirawat dengan penuh cinta. Didik mereka dengan kesabaran, ajari mereka dengan keteladanan, dan jangan pernah lelah mendoakan mereka di setiap sujudmu.',
          },
        ],
      },
    ],
  },
  {
    key: 'umum',
    label: 'Umum',
    sub: [
      {
        key: 'kehidupan',
        label: 'Kehidupan',
        items: [
          {
            id: 'umum-1',
            title: 'Hidup Adalah Ujian',
            quote: '"Apakah manusia mengira bahwa mereka akan dibiarkan hanya dengan mengatakan "Kami telah beriman", dan mereka tidak diuji?"',
            source: 'QS. Al-Ankabut: 2',
            content: 'Setiap masalah yang datang adalah ujian dari Allah. Ujian bukan tanda benci, tetapi bukti cinta Allah untuk meninggikan derajat hamba-Nya. Maka hadapilah setiap ujian dengan sabar dan tawakal. Ingatlah bahwa setelah kesulitan pasti ada kemudahan.',
          },
          {
            id: 'umum-2',
            title: 'Jangan Bersedih',
            quote: '"Janganlah kamu bersedih, sesungguhnya Allah bersama kita."',
            source: 'QS. At-Taubah: 40',
            content: 'Kesedihan adalah bagian dari kehidupan, tapi jangan biarkan ia berlarut-larut. Allah selalu bersama hamba-Nya yang sabar. Setiap air mata yang engkau tahan karena Allah, akan diganti dengan kebahagiaan yang tak terduga. Bangkitlah dan terus melangkah.',
          },
        ],
      },
      {
        key: 'sabar',
        label: 'Sabar',
        items: [
          {
            id: 'sabar-1',
            title: 'Sabar Itu Indah',
            quote: '"Sesungguhnya hanya orang-orang yang bersabarlah yang dicukupkan pahala mereka tanpa batas."',
            source: 'QS. Az-Zumar: 10',
            content: 'Sabar adalah kunci segala kebaikan. Allah menjanjikan pahala tanpa batas bagi orang yang sabar. Maka bersabarlah dalam menghadapi cobaan, bersabarlah dalam menahan amarah, dan bersabarlah dalam terus berbuat baik. Karena Allah bersama orang-orang yang sabar.',
          },
          {
            id: 'sabar-2',
            title: 'Bersabar Dalam Ujian',
            quote: '"Dan kami pasti akan menguji kamu dengan sedikit ketakutan, kelaparan, kekurangan harta, jiwa, dan buah-buahan. Dan sampaikanlah berita gembira kepada orang-orang yang sabar."',
            source: 'QS. Al-Baqarah: 155',
            content: 'Ujian datang silih berganti. Tapi Allah telah memberikan kabar gembira kepada orang-orang yang bersabar. Setiap ujian adalah proses pemurnian iman. Seperti emas yang dimurnikan dengan api, iman kita dimurnikan dengan ujian. Maka hadapilah dengan senyuman.',
          },
        ],
      },
      {
        key: 'syukur',
        label: 'Syukur',
        items: [
          {
            id: 'syukur-1',
            title: 'Nikmat Yang Terlupakan',
            quote: '"Dan Dia telah memberikan kepadamu segala apa yang kamu mohonkan kepada-Nya. Dan jika kamu menghitung nikmat Allah, niscaya kamu tidak akan mampu menghitungnya."',
            source: 'QS. Ibrahim: 34',
            content: 'Coba hitung nikmat Allah: udara yang kau hirup, detak jantungmu, penglihatan, pendengaran, keluarga yang menyayangimu, makanan yang kau makan. Semua gratis dan tak ternilai harganya. Jangan kufur nikmat dengan selalu melihat apa yang tidak dimiliki.',
          },
          {
            id: 'syukur-2',
            title: 'Syukur Kunci Bahagia',
            quote: '"Barangsiapa yang tidak bersyukur kepada manusia, maka ia tidak bersyukur kepada Allah."',
            source: 'HR. Abu Dawud',
            content: 'Bersyukur bukan hanya dengan mengucap Alhamdulillah, tetapi juga dengan menggunakan nikmat Allah di jalan kebaikan. Syukuri setiap orang yang telah berjasa dalam hidupmu. Ucapkan terima kasih, hargai pemberian mereka. Syukur melahirkan kebahagiaan sejati.',
          },
        ],
      },
    ],
  },
];

export function getAllCategories() {
  return MOTIVATIONS;
}

export function getCategory(key) {
  return MOTIVATIONS.find(c => c.key === key);
}

export function getMotivationById(id) {
  for (const cat of MOTIVATIONS) {
    for (const sub of cat.sub) {
      const item = sub.items.find(i => i.id === id);
      if (item) return item;
    }
  }
  return null;
}

export async function getFavorites() {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return ids.map(id => getMotivationById(id)).filter(Boolean);
  } catch { return []; }
}

export async function isFavorite(id) {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return ids.includes(id);
  } catch { return false; }
}

export async function toggleFavorite(id) {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    let ids = raw ? JSON.parse(raw) : [];
    if (ids.includes(id)) {
      ids = ids.filter(i => i !== id);
    } else {
      ids.push(id);
    }
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids));
    return ids.includes(id);
  } catch { return false; }
}
