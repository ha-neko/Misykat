import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'motivation_favorites';

const ALL = [
  // ========== PEKERJAAN ==========
  {
    id: 'p1', cat: 'pekerjaan', sub: 'semangat',
    title: 'Niat Karena Allah',
    quote: '"Sesungguhnya amal itu tergantung niatnya, dan setiap orang hanya mendapatkan sesuai niatnya."',
    source: 'HR. Bukhari & Muslim',
    content: 'Bekerja bukan sekadar mencari nafkah. Jadikan setiap pekerjaan sebagai ibadah dengan meluruskan niat karena Allah. Dengan niat yang benar, pekerjaan yang biasa pun menjadi bernilai pahala di sisi-Nya.',
  },
  {
    id: 'p2', cat: 'pekerjaan', sub: 'semangat',
    title: 'Lelah Jadi Berkah',
    quote: '"Barangsiapa di waktu sore merasa lelah karena bekerja, maka di waktu sore itu dosanya diampuni."',
    source: 'HR. Thabrani',
    content: 'Kelelahan setelah bekerja bisa menjadi penghapus dosa jika diniatkan untuk mencari rezeki halal bagi keluarga. Maka janganlah mengeluh dengan lelahnya bekerja.',
  },
  {
    id: 'p3', cat: 'pekerjaan', sub: 'semangat',
    title: 'Itqan',
    quote: '"Sesungguhnya Allah mencintai seseorang yang apabila bekerja, ia bekerja secara profesional."',
    source: 'HR. Baihaqi',
    content: 'Bekerja secara profesional dan teliti adalah bentuk kecintaan kepada Allah. Itqan berarti melakukan pekerjaan dengan sempurna, penuh tanggung jawab, dan hasil terbaik.',
  },
  {
    id: 'p4', cat: 'pekerjaan', sub: 'semangat',
    title: 'Tangan Di Atas',
    quote: '"Tangan di atas lebih baik daripada tangan di bawah."',
    source: 'HR. Bukhari & Muslim',
    content: 'Bekerja keras untuk memberi lebih baik daripada menerima. Jadilah pribadi yang produktif dan bermanfaat bagi orang lain. Keberkahan hidup ada pada memberi.',
  },
  {
    id: 'p5', cat: 'pekerjaan', sub: 'semangat',
    title: 'Jangan Malas',
    quote: '"Janganlah kamu menjadi lemah, dan jangan pula bersedih hati, padahal kamulah orang-orang yang paling tinggi derajatnya jika kamu beriman."',
    source: 'QS. Ali Imran: 139',
    content: 'Kemalasan adalah musuh produktivitas. Bangkitlah, bergeraklah, dan jadilah insan yang bermanfaat. Allah meninggikan derajat orang-orang yang beriman dan beramal saleh.',
  },
  {
    id: 'p6', cat: 'pekerjaan', sub: 'semangat',
    title: 'Pagi Yang Berkah',
    quote: '"Ya Allah, berkahilah umatku di waktu paginya."',
    source: 'HR. Abu Dawud',
    content: 'Memulai pekerjaan di pagi hari membawa keberkahan. Manfaatkan waktu pagi untuk memulai aktivitas karena Rasulullah mendoakan keberkahan di waktu pagi.',
  },
  {
    id: 'p7', cat: 'pekerjaan', sub: 'rezeki',
    title: 'Jaminan Rezeki',
    quote: '"Dan barangsiapa bertakwa kepada Allah, niscaya Dia akan membukakan jalan keluar baginya, dan memberinya rezeki dari arah yang tidak disangka-sangka."',
    source: 'QS. Ath-Thalaq: 2-3',
    content: 'Rezeki sudah dijamin Allah. Tugas kita adalah bertakwa dan berusaha. Jangan pernah khawatir tentang rezeki karena Allah Maha Pemberi Rezeki kepada hamba-Nya yang bertakwa.',
  },
  {
    id: 'p8', cat: 'pekerjaan', sub: 'rezeki',
    title: 'Rezeki Halal',
    quote: '"Dan Allah menghalalkan jual beli dan mengharamkan riba."',
    source: 'QS. Al-Baqarah: 275',
    content: 'Rezeki yang halal meskipun sedikit lebih baik daripada rezeki yang haram meskipun banyak. Karena rezeki halal membawa keberkahan, sementara yang haram hanya membawa masalah.',
  },
  {
    id: 'p9', cat: 'pekerjaan', sub: 'rezeki',
    title: 'Syukur Tambah Rezeki',
    quote: '"Sesungguhnya jika kamu bersyukur, pasti Aku akan menambah (nikmat) kepadamu."',
    source: 'QS. Ibrahim: 7',
    content: 'Bersyukur adalah kunci bertambahnya rezeki. Lihatlah ke bawah dalam urusan dunia agar hatimu selalu bersyukur. Syukur membuka pintu keberkahan yang tak terduga.',
  },
  {
    id: 'p10', cat: 'pekerjaan', sub: 'rezeki',
    title: 'Rezeki Tak Tertukar',
    quote: '"Dan tidak ada suatu binatang melata pun di bumi melainkan Allah-lah yang memberi rezekinya."',
    source: 'QS. Hud: 6',
    content: 'Rezeki setiap makhluk sudah diatur Allah. Tidak ada satu pun yang luput dari jaminan-Nya. Maka janganlah takut miskin karena berbuat kebaikan atau bersedekah.',
  },
  {
    id: 'p11', cat: 'pekerjaan', sub: 'rezeki',
    title: 'Bersedekah',
    quote: '"Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji."',
    source: 'QS. Al-Baqarah: 261',
    content: 'Sedekah tidak mengurangi rezeki, justru melipatgandakannya. Allah menjanjikan balasan berlipat ganda bagi orang yang bersedekah. Maka janganlah ragu untuk berbagi.',
  },
  {
    id: 'p12', cat: 'pekerjaan', sub: 'keikhlasan',
    title: 'Ikhlas Itu Ringan',
    quote: '"Padahal mereka tidak disuruh kecuali supaya menyembah Allah dengan memurnikan ketaatan kepada-Nya."',
    source: 'QS. Al-Bayyinah: 5',
    content: 'Keikhlasan adalah rahasia antara hamba dengan Tuhannya. Jika engkau ikhlas dalam bekerja, tekanan dan beban akan terasa ringan karena engkau bekerja untuk ridha Allah, bukan pujian manusia.',
  },
  {
    id: 'p13', cat: 'pekerjaan', sub: 'keikhlasan',
    title: 'Amal Yang Lestari',
    quote: '"Apabila anak Adam meninggal, putuslah amalnya kecuali tiga: sedekah jariyah, ilmu yang bermanfaat, atau anak saleh yang mendoakannya."',
    source: 'HR. Muslim',
    content: 'Apa yang akan kau tinggalkan setelah mati? Bekerjalah dengan ikhlas agar amalmu menjadi sedekah jariyah yang terus mengalir pahalanya, bahkan setelah kau tiada.',
  },
  {
    id: 'p14', cat: 'pekerjaan', sub: 'keikhlasan',
    title: 'Tidak Sia-sia',
    quote: '"Tidaklah seorang Muslim menanam tanaman, lalu dimakan oleh burung, manusia atau binatang, melainkan itu menjadi sedekah baginya."',
    source: 'HR. Bukhari & Muslim',
    content: 'Setiap kebaikan yang engkau lakukan dalam pekerjaan yang memberikan manfaat kepada orang lain akan menjadi pahala. Allah tidak menyia-nyiakan amal hamba-Nya walau sebesar biji sawi.',
  },
  {
    id: 'p15', cat: 'pekerjaan', sub: 'keikhlasan',
    title: 'Riya Penghapus Pahala',
    quote: '"Hai orang-orang yang beriman, janganlah kamu menghilangkan pahala sedekahmu dengan menyebut-nyebutnya dan menyakiti."',
    source: 'QS. Al-Baqarah: 264',
    content: 'Ikhlas itu seperti air jernih — jika tercampur riya, keruhlah ia. Jaga niatmu dari pujian manusia. Lakukan pekerjaan dengan tulus karena Allah, niscaya pahalamu sempurna.',
  },
  {
    id: 'p16', cat: 'pekerjaan', sub: 'keikhlasan',
    title: 'Fokus Pada Proses',
    quote: '"Siapa yang menginginkan dunia, hendaklah ia berilmu. Siapa yang menginginkan akhirat, hendaklah ia berilmu."',
    source: 'HR. Muslim',
    content: 'Kesuksesan tidak datang instan. Nikmati prosesnya, belajar dari setiap kegagalan, dan teruslah memperbaiki diri. Allah bersama orang-orang yang sabar dalam proses.',
  },

  // ========== KELUARGA ==========
  {
    id: 'k1', cat: 'keluarga', sub: 'suami',
    title: 'Pemimpin Keluarga',
    quote: '"Kaum laki-laki itu adalah pemimpin bagi kaum perempuan."',
    source: 'QS. An-Nisa: 34',
    content: 'Menjadi pemimpin keluarga bukanlah tentang kekuasaan, melainkan tanggung jawab. Suami yang baik adalah yang melayani keluarganya, memberikan nafkah lahir dan batin, serta menjadi teladan.',
  },
  {
    id: 'k2', cat: 'keluarga', sub: 'suami',
    title: 'Terbaik Untuk Keluarga',
    quote: '"Sebaik-baik kalian adalah yang paling baik terhadap keluarganya, dan aku adalah yang paling baik terhadap keluargaku."',
    source: 'HR. Tirmidzi',
    content: 'Ukuran kebaikan seorang suami bukan dari hartanya, tetapi dari bagaimana ia memperlakukan keluarganya. Senyuman untuk istri, membantu pekerjaan rumah, bermain dengan anak — itu semua amal saleh.',
  },
  {
    id: 'k3', cat: 'keluarga', sub: 'suami',
    title: 'Nafkah Keluarga',
    quote: '"Dan kewajiban ayah memberi makan dan pakaian kepada para ibu dengan cara yang ma\'ruf."',
    source: 'QS. Al-Baqarah: 233',
    content: 'Memberi nafkah kepada keluarga adalah ibadah. Setiap rupiah yang kau cari dengan halal untuk keluargamu akan menjadi pahala di sisi Allah. Jangan lelah mencari rezeki untuk mereka.',
  },
  {
    id: 'k4', cat: 'keluarga', sub: 'suami',
    title: 'Senyum Untuk Istri',
    quote: '"Senyummu di hadapan saudaramu adalah sedekah."',
    source: 'HR. Tirmidzi',
    content: 'Jangan pelit senyum untuk istri dan anak-anakmu. Senyuman adalah sedekah paling ringan. Muka masam di rumah hanya akan menjauhkan kasih sayang. Jadilah suami yang menyenangkan.',
  },
  {
    id: 'k5', cat: 'keluarga', sub: 'istri',
    title: 'Perhiasan Dunia',
    quote: '"Dunia adalah perhiasan, dan sebaik-baik perhiasan adalah wanita yang salehah."',
    source: 'HR. Muslim',
    content: 'Istri salehah adalah perhiasan dunia yang paling berharga. Ia adalah madrasah pertama bagi anak-anaknya, pengelola rumah tangga yang amanah, dan penyejuk hati suami.',
  },
  {
    id: 'k6', cat: 'keluarga', sub: 'istri',
    title: 'Jalan ke Surga',
    quote: '"Apabila seorang wanita melaksanakan shalat lima waktu, berpuasa Ramadhan, menjaga kemaluannya, dan menaati suaminya, maka masuklah ke surga dari pintu mana saja."',
    source: 'HR. Ahmad',
    content: 'Ketaatan kepada suami dalam kebaikan adalah jalan utama menuju surga bagi istri. Bukan ketaatan buta, tetapi ketaatan yang penuh cinta dan saling pengertian dalam membangun keluarga sakinah.',
  },
  {
    id: 'k7', cat: 'keluarga', sub: 'istri',
    title: 'Penyabar',
    quote: '"Dan orang-orang yang sabar dalam kesempitan, penderitaan dan dalam peperangan. Mereka itulah orang-orang yang benar."',
    source: 'QS. Al-Baqarah: 177',
    content: 'Jadilah istri yang sabar menghadapi ujian rumah tangga. Kesabaran seorang istri adalah pilar kokoh keluarga. Allah bersama orang-orang yang sabar dan menjanjikan pahala tanpa batas.',
  },
  {
    id: 'k8', cat: 'keluarga', sub: 'ibu',
    title: 'Kasih Ibu',
    quote: '"Ibunya telah mengandungnya dalam keadaan lemah yang bertambah-tambah."',
    source: 'QS. Luqman: 14',
    content: 'Ibu mengandung dengan susah payah, melahirkan dengan taruhan nyawa, menyusui dengan penuh cinta. Jasa ibu tidak akan pernah terbalaskan. Maka hormatilah ibumu selagi ia masih ada.',
  },
  {
    id: 'k9', cat: 'keluarga', sub: 'ibu',
    title: 'Ridha Allah Pada Ibu',
    quote: '"Ridha Allah tergantung pada ridha orang tua, dan murka Allah tergantung pada murka orang tua."',
    source: 'HR. Tirmidzi',
    content: 'Doa ibu adalah senjata paling ampuh. Jika engkau ingin sukses dunia akhirat, raihlah ridha ibumu. Karena di bawah telapak kaki ibulah surga itu berada.',
  },
  {
    id: 'k10', cat: 'keluarga', sub: 'ibu',
    title: 'Surat Cinta Untuk Ibu',
    quote: '"Dan kami perintahkan kepada manusia agar berbuat baik kepada kedua orang tuanya."',
    source: 'QS. Al-Ahqaf: 15',
    content: 'Jangan hanya memberi ibu materi, tapi berikan perhatian dan kasih sayang. Teleponlah ia, tanyakan kabarnya, dan jangan pernah lelah melayaninya. Waktu bersama ibu sangat berharga.',
  },
  {
    id: 'k11', cat: 'keluarga', sub: 'ibu',
    title: 'Ibu Madrasah Pertama',
    quote: '"Ibu adalah madrasah pertama bagi anak-anaknya."',
    source: 'Syair Arab',
    content: 'Peran ibu dalam mendidik anak sangat besar. Ibu adalah sekolah pertama yang membentuk karakter anak. Maka jadilah ibu yang cerdas, berilmu, dan bertakwa agar anak-anak tumbuh saleh.',
  },
  {
    id: 'k12', cat: 'keluarga', sub: 'anak',
    title: 'Amanah Terindah',
    quote: '"Harta dan anak-anak adalah perhiasan kehidupan dunia."',
    source: 'QS. Al-Kahfi: 46',
    content: 'Anak adalah amanah dari Allah yang harus dijaga dan dididik. Mereka adalah investasi akhirat yang paling berharga. Setiap kebaikan yang mereka lakukan karena didikan kita akan terus mengalir pahalanya.',
  },
  {
    id: 'k13', cat: 'keluarga', sub: 'anak',
    title: 'Didik Dengan Kasih',
    quote: '"Muliakanlah anak-anakmu dan perbaikilah pendidikan mereka."',
    source: 'HR. Ibnu Majah',
    content: 'Anak bukanlah kertas kosong, melainkan benih yang perlu dirawat dengan penuh cinta. Didik mereka dengan kesabaran, ajari dengan keteladanan, dan jangan lelah mendoakan mereka di setiap sujud.',
  },
  {
    id: 'k14', cat: 'keluarga', sub: 'anak',
    title: 'Doakan Anakmu',
    quote: '"Doa orang tua untuk anaknya adalah doa yang mustajab."',
    source: 'HR. Tirmidzi',
    content: 'Jangan pernah berhenti mendoakan anak-anakmu. Doa orang tua adalah senjata yang tidak terlihat namun sangat kuat. Minta kepada Allah agar anak-anakmu menjadi penyejuk mata dan kebanggaan di dunia dan akhirat.',
  },

  // ========== UMUM ==========
  {
    id: 'u1', cat: 'umum', sub: 'kehidupan',
    title: 'Hidup Adalah Ujian',
    quote: '"Apakah manusia mengira bahwa mereka akan dibiarkan hanya dengan mengatakan "Kami telah beriman", dan mereka tidak diuji?"',
    source: 'QS. Al-Ankabut: 2',
    content: 'Setiap masalah adalah ujian dari Allah untuk meninggikan derajat hamba-Nya. Maka hadapilah setiap ujian dengan sabar dan tawakal. Ingatlah bahwa setelah kesulitan pasti ada kemudahan.',
  },
  {
    id: 'u2', cat: 'umum', sub: 'kehidupan',
    title: 'Allah Bersama Kita',
    quote: '"Janganlah kamu bersedih, sesungguhnya Allah bersama kita."',
    source: 'QS. At-Taubah: 40',
    content: 'Kesedihan adalah bagian dari hidup, tapi jangan biarkan ia berlarut-larut. Allah selalu bersama hamba-Nya yang sabar. Setiap air mata akan diganti dengan kebahagiaan yang tak terduga. Bangkitlah.',
  },
  {
    id: 'u3', cat: 'umum', sub: 'kehidupan',
    title: 'Jangan Putus Asa',
    quote: '"Dan jangan kamu berputus asa dari rahmat Allah. Sesungguhnya tiada berputus asa dari rahmat Allah melainkan kaum yang kafir."',
    source: 'QS. Yusuf: 87',
    content: 'Seberapa besar pun masalahmu, jangan pernah putus asa. Rahmat Allah lebih luas dari segalanya. Selalu ada harapan selama engkau masih bernafas. Allah tidak akan membebani hamba di luar kemampuannya.',
  },
  {
    id: 'u4', cat: 'umum', sub: 'kehidupan',
    title: 'Berprasangka Baik',
    quote: '"Aku sesuai prasangka hamba-Ku. Maka berprasangkalah kepada-Ku dengan prasangka yang baik."',
    source: 'Hadits Qudsi',
    content: 'Allah memperlakukan hamba-Nya sesuai prasangkanya. Jika engkau berprasangka baik kepada Allah, maka kebaikan akan datang padamu. Yakinlah bahwa Allah selalu menghendaki yang terbaik untukmu.',
  },
  {
    id: 'u5', cat: 'umum', sub: 'kehidupan',
    title: 'Bersyukur',
    quote: '"Karena itu, ingatlah kamu kepada-Ku niscaya Aku ingat (pula) kepadamu."',
    source: 'QS. Al-Baqarah: 152',
    content: 'Mengingat Allah adalah bentuk syukur tertinggi. Dengan mengingat-Nya, hati menjadi tenang. Jangan biarkan kesibukan duniamu melupakan Rabb-mu. Sempatkan berdzikir di setiap kesempatan.',
  },
  {
    id: 'u6', cat: 'umum', sub: 'sabar',
    title: 'Pahala Tanpa Batas',
    quote: '"Sesungguhnya hanya orang-orang yang bersabarlah yang dicukupkan pahala mereka tanpa batas."',
    source: 'QS. Az-Zumar: 10',
    content: 'Sabar adalah kunci segala kebaikan. Allah menjanjikan pahala tanpa batas bagi yang sabar. Maka bersabarlah dalam cobaan, dalam menahan amarah, dan dalam terus berbuat baik.',
  },
  {
    id: 'u7', cat: 'umum', sub: 'sabar',
    title: 'Ujian Adalah Cinta',
    quote: '"Sesungguhnya besarnya pahala tergantung besarnya cobaan. Dan jika Allah mencintai suatu kaum, maka Dia akan menguji mereka."',
    source: 'HR. Tirmidzi',
    content: 'Cobaan adalah tanda cinta Allah. Seperti emas dimurnikan dengan api, iman kita dimurnikan dengan ujian. Orang yang paling berat ujiannya adalah para nabi, kemudian orang-orang saleh.',
  },
  {
    id: 'u8', cat: 'umum', sub: 'sabar',
    title: 'Bersabar Dalam Ujian',
    quote: '"Dan sampaikanlah berita gembira kepada orang-orang yang sabar, (yaitu) yang apabila ditimpa musibah mereka mengucapkan Inna lillahi wa inna ilaihi raji\'un."',
    source: 'QS. Al-Baqarah: 155-156',
    content: 'Setiap ujian adalah proses pemurnian iman. Ucapkan istirja ketika ditimpa musibah. Yakinlah bahwa Allah akan mengganti yang lebih baik. Kesabaran di awal musibah adalah yang terbaik.',
  },
  {
    id: 'u9', cat: 'umum', sub: 'sabar',
    title: 'Sabarnya Nabi Ayyub',
    quote: '"Sungguh, kami dapati dia (Ayyub) seorang yang sabar. Dialah sebaik-baik hamba. Sungguh, dia sangat taat."',
    source: 'QS. Shad: 44',
    content: 'Nabi Ayyub diuji dengan penyakit bertahun-tahun, kehilangan harta dan anak. Tapi ia tetap sabar dan tidak pernah berputus asa dari rahmat Allah. Jadikan kesabarannya sebagai teladan.',
  },
  {
    id: 'u10', cat: 'umum', sub: 'syukur',
    title: 'Nikmat Tak Terhitung',
    quote: '"Dan jika kamu menghitung nikmat Allah, niscaya kamu tidak akan mampu menghitungnya."',
    source: 'QS. Ibrahim: 34',
    content: 'Coba hitung nikmat Allah hari ini: nafas yang masih berhembus, mata yang bisa melihat, telinga yang bisa mendengar, keluarga yang menyayangi. Nikmat Allah tak terhitung jumlahnya. Jangan kufur nikmat.',
  },
  {
    id: 'u11', cat: 'umum', sub: 'syukur',
    title: 'Syukur Pada Manusia',
    quote: '"Barangsiapa yang tidak bersyukur kepada manusia, maka ia tidak bersyukur kepada Allah."',
    source: 'HR. Abu Dawud',
    content: 'Bersyukur bukan hanya dengan lisan, tetapi juga dengan perbuatan. Hargai setiap orang yang berjasa dalam hidupmu. Ucapkan terima kasih, balas kebaikan mereka. Syukur melahirkan kebahagiaan sejati.',
  },
  {
    id: 'u12', cat: 'umum', sub: 'syukur',
    title: 'Nikmat Sehat',
    quote: '"Dua nikmat yang sering dilupakan oleh kebanyakan manusia: kesehatan dan waktu luang."',
    source: 'HR. Bukhari',
    content: 'Kesehatan adalah nikmat yang paling sering dilupakan. Jangan tunggu sakit baru berharga. Manfaatkan waktu sehatmu untuk beribadah, berkarya, dan berbuat kebaikan sebanyak-banyaknya.',
  },
  {
    id: 'u13', cat: 'umum', sub: 'syukur',
    title: 'Syukur Dengan Amal',
    quote: '"Beramallah wahai keluarga Daud sebagai bentuk syukur. Dan sedikit sekali dari hamba-Ku yang bersyukur."',
    source: 'QS. Saba: 13',
    content: 'Syukur bukan hanya diucapkan, tetapi diamalkan. Gunakan nikmat Allah untuk beribadah dan berbuat baik. Nikmat yang digunakan di jalan Allah akan mendatangkan keberkahan.',
  },
  {
    id: 'u14', cat: 'umum', sub: 'syukur',
    title: 'Lihat Ke Bawah',
    quote: '"Lihatlah orang yang berada di bawahmu dalam urusan dunia, dan lihatlah orang yang berada di atasmu dalam urusan agama."',
    source: 'HR. Muslim',
    content: 'Agar hatimu selalu bersyukur, lihatlah ke bawah dalam urusan dunia. Masih banyak yang lebih susah darimu. Dan lihatlah ke atas dalam urusan agama agar semangat beribadahmu terus meningkat.',
  },
];

export function getShuffled(category) {
  let pool = ALL;
  if (category && category !== '_all') {
    pool = ALL.filter(i => i.cat === category);
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getSubcategories(category) {
  const subs = [...new Set(ALL.filter(i => i.cat === category).map(i => i.sub))];
  return subs;
}

export function getCategories() {
  return [...new Set(ALL.map(i => i.cat))];
}

export function getCategoryLabel(cat) {
  const labels = { pekerjaan: 'Pekerjaan', keluarga: 'Keluarga', umum: 'Umum', '_fav': 'Favorit' };
  return labels[cat] || cat;
}

export function getMotivationById(id) {
  return ALL.find(i => i.id === id) || null;
}

export async function getFavorites() {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return ids.map(id => ALL.find(i => i.id === id)).filter(Boolean);
  } catch { return []; }
}

export async function getFavIds() {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
