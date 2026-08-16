import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIRECTORY = path.resolve(TEST_DIRECTORY, "..", "messages");
const SITE_SOURCE_PATH = path.resolve(TEST_DIRECTORY, "..", "lib", "site.ts");
const BASE_LOCALE = "ko";
const SUPPORTED_LOCALES = ["ko", "en", "ja", "ne", "vi", "lo"];

function readGlobalSiteDescription() {
  const siteSource = readFileSync(SITE_SOURCE_PATH, "utf8");
  const description = siteSource.match(/\n  description:\n    "([^"]+)",/u)?.[1];

  assert.ok(description, "SITE.description must remain a plain string in company/lib/site.ts");
  return description;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCatalogPath(locale, catalogDirectory) {
  return path.join(catalogDirectory, `${locale}.json`);
}

function readCatalog(locale, catalogDirectory) {
  const catalogPath = getCatalogPath(locale, catalogDirectory);

  assert.ok(
    existsSync(catalogPath),
    `Missing ${locale} translation catalog: ${path.relative(process.cwd(), catalogPath)}`,
  );

  try {
    return JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch (error) {
    assert.fail(
      `Unable to parse ${locale} translation catalog (${path.relative(process.cwd(), catalogPath)}): ${error.message}`,
    );
  }
}

function getCatalogDirectories(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const hasLocaleCatalog = SUPPORTED_LOCALES.some((locale) =>
    entries.some((entry) => entry.isFile() && entry.name === `${locale}.json`),
  );
  const childDirectories = entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => getCatalogDirectories(path.join(directory, entry.name)));

  return hasLocaleCatalog ? [directory, ...childDirectories] : childDirectories;
}

function displayPath(keyPath) {
  return keyPath || "<root>";
}

function assertValidCatalog(value, locale, keyPath = "") {
  assert.ok(
    isObject(value),
    `${locale}:${displayPath(keyPath)} must be an object, not ${Array.isArray(value) ? "an array" : typeof value}`,
  );

  const keys = Object.keys(value);

  assert.ok(keys.length > 0, `${locale}:${displayPath(keyPath)} must not be an empty object`);

  for (const key of keys) {
    const childPath = keyPath ? `${keyPath}.${key}` : key;
    const child = value[key];

    if (isObject(child)) {
      assertValidCatalog(child, locale, childPath);
      continue;
    }

    assert.equal(
      typeof child,
      "string",
      `${locale}:${childPath} must be a string leaf, not ${Array.isArray(child) ? "an array" : typeof child}`,
    );
    assert.ok(child.trim().length > 0, `${locale}:${childPath} must not be an empty string`);
  }
}

function assertSameStructure(base, translated, locale, keyPath = "") {
  const baseKeys = Object.keys(base).sort();
  const translatedKeys = Object.keys(translated).sort();

  assert.deepEqual(
    translatedKeys,
    baseKeys,
    `${locale}:${displayPath(keyPath)} must have exactly the same keys as ${BASE_LOCALE}`,
  );

  for (const key of baseKeys) {
    const childPath = keyPath ? `${keyPath}.${key}` : key;
    const baseValue = base[key];
    const translatedValue = translated[key];
    const baseIsObject = isObject(baseValue);
    const translatedIsObject = isObject(translatedValue);

    assert.equal(
      translatedIsObject,
      baseIsObject,
      `${locale}:${childPath} must have the same object/string type as ${BASE_LOCALE}`,
    );

    if (baseIsObject) {
      assertSameStructure(baseValue, translatedValue, locale, childPath);
    }
  }
}

test("all translation catalog groups match their Korean baseline", () => {
  const catalogDirectories = getCatalogDirectories(MESSAGES_DIRECTORY);

  assert.ok(catalogDirectories.length > 0, "No translation catalog directories were found");

  for (const catalogDirectory of catalogDirectories) {
    const catalogLabel = path.relative(MESSAGES_DIRECTORY, catalogDirectory) || ".";
    const catalogs = new Map(
      SUPPORTED_LOCALES.map((locale) => [locale, readCatalog(locale, catalogDirectory)]),
    );
    const koreanCatalog = catalogs.get(BASE_LOCALE);

    assertValidCatalog(koreanCatalog, `${BASE_LOCALE}:${catalogLabel}`);

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = catalogs.get(locale);
      const catalogLocale = `${locale}:${catalogLabel}`;

      assertValidCatalog(catalog, catalogLocale);

      if (locale !== BASE_LOCALE) {
        assertSameStructure(koreanCatalog, catalog, catalogLocale);
      }
    }
  }
});

test("company refresh copy is complete in every supported locale", () => {
  const expected = {
    ko: {
      hero: ["해외 현지 교육·모집부터", "한국·일본 취업까지"],
      countries: "네팔, 베트남, 미얀마, 라오스, 스리랑카, 한국, 일본",
      partners: "네팔 6곳, 베트남 3곳, 라오스 2곳",
      intro: "체계적인 교육과 객관적인 검증을 통해 현장에 적합한 인재를 선발합니다.",
      partnership: "축적된 해외 인력 운영 경험과 외국 현지 기관과의 전략적 협력 체계를 바탕으로 근로자 선발, 역량 검증, 사전 교육, 출입국 행정까지 통합 관리 시스템을 운영합니다.",
      contact: ["정확한 상담을 위해 문의 시 필요한 정보와 절차를 안내드립니다.", "문의 안내", "채용·제휴 문의는 아래 번호 또는 이메일로 연락 부탁드립니다.", "문의 내용이 명확하지 않더라도 부담 없이 연락해 주세요. 전문 상담을 통해 고객님의 상황에 맞는 최적의 방안을 안내해 드리겠습니다."],
    },
    en: {
      hero: ["From local training and recruitment abroad", "to employment in Korea and Japan"],
      countries: "Nepal, Vietnam, Myanmar, Laos, Sri Lanka, Republic of Korea, and Japan",
      partners: "6 in Nepal, 3 in Vietnam, and 2 in Laos",
      intro: "Through structured training and objective assessment, we select talent suited to real workplace needs.",
      partnership: "Building on our experience in international workforce management and strategic partnerships with local institutions abroad, we operate an integrated management system covering worker selection, competency assessment, pre-departure training, and guidance and coordination for immigration-related administrative procedures.",
      contact: ["To ensure an accurate consultation, we explain the information required and the steps to follow when you contact us.", "How to contact us", "For recruitment or partnership inquiries, please contact us using one of the phone numbers or the email address below.", "Even if you are not yet sure how to frame your inquiry, please feel free to contact us. Through a professional consultation, we will guide you toward the approach best suited to your circumstances."],
    },
    ja: {
      hero: ["海外現地での教育・募集から", "韓国・日本での就業まで"],
      countries: "ネパール、ベトナム、ミャンマー、ラオス、スリランカ、韓国、日本",
      partners: "ネパール6機関、ベトナム3機関、ラオス2機関",
      intro: "体系的な教育と客観的な評価を通じて、現場に適した人材を選抜します。",
      partnership: "海外人材事業で培った運営経験と、海外現地機関との戦略的な協力体制を基盤に、労働者の選抜、能力評価、事前教育、出入国関連の行政手続に関する案内・連携までを一元管理するシステムを運用しています。",
      contact: ["的確なご相談対応のため、お問い合わせ時に必要な情報と手順をご案内します。", "お問い合わせのご案内", "採用・提携に関するお問い合わせは、下記の電話番号またはメールアドレスまでご連絡ください。", "お問い合わせ内容がまだ明確でなくても、どうぞお気軽にご連絡ください。専門の担当者がお話を伺い、お客様の状況に最適な方法をご案内いたします。"],
    },
    ne: {
      hero: ["विदेशमै स्थानीय तालिम र भर्नादेखि", "कोरिया र जापानमा रोजगारीसम्म"],
      countries: "नेपाल, भियतनाम, म्यानमार, लाओस, श्रीलंका, कोरिया र जापान",
      partners: "नेपालमा 6, भियतनाममा 3 र लाओसमा 2 संस्था",
      intro: "व्यवस्थित तालिम र वस्तुनिष्ठ मूल्याङ्कनमार्फत कार्यस्थलका लागि उपयुक्त जनशक्ति छनोट गर्छौँ।",
      partnership: "विदेशी जनशक्ति व्यवस्थापनमा सञ्चित अनुभव र विदेशका स्थानीय संस्थाहरूसँगको रणनीतिक सहकार्य संरचनाका आधारमा हामी कामदार छनोट, क्षमता प्रमाणीकरण, प्रस्थानपूर्व तालिम तथा अध्यागमनसम्बन्धी प्रशासनिक प्रक्रियामा मार्गदर्शन र समन्वय समेट्ने एकीकृत व्यवस्थापन प्रणाली सञ्चालन गर्छौँ।",
      contact: ["सही परामर्शका लागि सोधपुछ गर्दा आवश्यक जानकारी र प्रक्रियाबारे हामी मार्गदर्शन गर्छौँ।", "सोधपुछसम्बन्धी जानकारी", "भर्ती वा साझेदारीसम्बन्धी सोधपुछका लागि कृपया तलको फोन नम्बर वा इमेलमा सम्पर्क गर्नुहोस्।", "सोधपुछको विषय अझै स्पष्ट नभए पनि निःसंकोच सम्पर्क गर्नुहोस्। विशेषज्ञ परामर्शमार्फत तपाईंको परिस्थितिअनुसार सबैभन्दा उपयुक्त उपायबारे मार्गदर्शन गर्नेछौँ।"],
    },
    vi: {
      hero: ["Từ đào tạo và tuyển mộ tại nước ngoài", "đến việc làm tại Hàn Quốc và Nhật Bản"],
      countries: "Nepal, Việt Nam, Myanmar, Lào, Sri Lanka, Hàn Quốc và Nhật Bản",
      partners: "6 tại Nepal, 3 tại Việt Nam và 2 tại Lào",
      intro: "Thông qua đào tạo bài bản và đánh giá khách quan, chúng tôi tuyển chọn nhân lực phù hợp với yêu cầu thực tế tại nơi làm việc.",
      partnership: "Dựa trên kinh nghiệm tích lũy trong quản lý nhân lực quốc tế và hệ thống hợp tác chiến lược với các tổ chức địa phương ở nước ngoài, chúng tôi vận hành một hệ thống quản lý tích hợp, bao quát việc tuyển chọn lao động, xác minh năng lực, đào tạo trước khi xuất cảnh, cùng hướng dẫn và phối hợp các thủ tục hành chính liên quan đến xuất nhập cảnh.",
      contact: ["Để tư vấn chính xác, chúng tôi hướng dẫn những thông tin cần cung cấp và quy trình khi liên hệ.", "Hướng dẫn liên hệ", "Đối với các yêu cầu về tuyển dụng hoặc hợp tác, vui lòng liên hệ qua số điện thoại hoặc email bên dưới.", "Ngay cả khi nội dung cần trao đổi chưa thật rõ ràng, quý khách cũng đừng ngần ngại liên hệ. Qua tư vấn chuyên môn, chúng tôi sẽ đề xuất phương án phù hợp nhất với tình hình của quý khách."],
    },
    lo: {
      hero: ["ຈາກການຝຶກອົບຮົມ ແລະ ການຮັບສະໝັກໃນທ້ອງຖິ່ນຕ່າງປະເທດ", "ສູ່ການເຮັດວຽກຢູ່ເກົາຫຼີ ແລະ ຍີ່ປຸ່ນ"],
      countries: "ເນປານ, ຫວຽດນາມ, ມຽນມາ, ລາວ, ສີລັງກາ, ເກົາຫຼີ ແລະ ຍີ່ປຸ່ນ",
      partners: "6 ອົງການໃນເນປານ, 3 ອົງການໃນຫວຽດນາມ ແລະ 2 ອົງການໃນລາວ",
      intro: "ພວກເຮົາຄັດເລືອກບຸກຄະລາກອນທີ່ເໝາະສົມກັບສະຖານທີ່ເຮັດວຽກ ຜ່ານການຝຶກອົບຮົມທີ່ເປັນລະບົບ ແລະ ການປະເມີນທີ່ເປັນກາງ.",
      partnership: "ໂດຍອາໄສປະສົບການທີ່ສະສົມມາໃນການບໍລິຫານບຸກຄະລາກອນສາກົນ ແລະ ລະບົບຄວາມຮ່ວມມືຍຸດທະສາດກັບອົງການທ້ອງຖິ່ນໃນຕ່າງປະເທດ, ພວກເຮົາດຳເນີນລະບົບບໍລິຫານແບບຄົບວົງຈອນ ທີ່ຄອບຄຸມການຄັດເລືອກແຮງງານ, ການກວດສອບຄວາມສາມາດ, ການຝຶກອົບຮົມກ່ອນເດີນທາງ, ແລະ ການໃຫ້ຄຳແນະນຳພ້ອມປະສານງານກ່ຽວກັບຂັ້ນຕອນບໍລິຫານດ້ານການເຂົ້າ-ອອກປະເທດ.",
      contact: ["ເພື່ອໃຫ້ການປຶກສາຖືກຕ້ອງ, ພວກເຮົາຈະແນະນຳຂໍ້ມູນ ແລະ ຂັ້ນຕອນທີ່ຈຳເປັນໃນເວລາສອບຖາມ.", "ຄຳແນະນຳການສອບຖາມ", "ສຳລັບການສອບຖາມເລື່ອງການຈ້າງງານ ຫຼື ການຮ່ວມມື, ກະລຸນາຕິດຕໍ່ຜ່ານເບີໂທລະສັບ ຫຼື ອີເມວດ້ານລຸ່ມ.", "ເຖິງແມ່ນວ່າເນື້ອໃນທີ່ຕ້ອງການສອບຖາມຍັງບໍ່ຊັດເຈນ, ກໍສາມາດຕິດຕໍ່ພວກເຮົາໄດ້ໂດຍບໍ່ຕ້ອງກັງວົນ. ຜ່ານການປຶກສາຢ່າງມືອາຊີບ, ພວກເຮົາຈະແນະນຳທາງເລືອກທີ່ເໝາະສົມທີ່ສຸດກັບສະຖານະການຂອງທ່ານ."],
    },
  };

  for (const [locale, copy] of Object.entries(expected)) {
    const catalog = readCatalog(locale, MESSAGES_DIRECTORY);
    assert.deepEqual([catalog.home.hero.title, catalog.home.hero.lineBreak], copy.hero);
    assert.equal(catalog.metrics.items.countries.value, "7");
    assert.equal(catalog.metrics.items.countries.sub, copy.countries);
    assert.equal(catalog.metrics.items.partners.value, "11");
    assert.equal(catalog.metrics.items.partners.sub, copy.partners);
    assert.equal(catalog.home.intro.title, copy.intro);
    assert.equal(catalog.footer.description, copy.intro);
    assert.equal(catalog.footer.countries, copy.countries);
    assert.equal(catalog.pages.why.main.principles.partnership.description, copy.partnership);
    assert.deepEqual(
      [catalog.pages.contact.main.description, catalog.pages.contact.form.title, catalog.pages.contact.form.description, catalog.pages.contact.form.reassurance],
      copy.contact,
    );
    assert.equal("network" in catalog.footer, false);
    assert.equal(catalog.site.nameEnglish, "Jeongwoo Human Resource Development Institute");
    assert.equal(catalog.site.alternateName, "Jeongwoo Human Resource Development Institute");
    assert.equal(catalog.site.legalNameEnglish, "Jeongwoo Human Resource Development Institute");
    assert.doesNotMatch(JSON.stringify(catalog), /JOONG WOO HRD|Joong Woo HRD/);
  }
});

test("global and localized descriptions distinguish all seven country roles", () => {
  const expectedGlobalDescription =
    "네팔에서 인재를 직접 교육·공급하고, 베트남·미얀마·라오스·스리랑카에서는 현지 파트너를 통해 인재를 공급합니다. 한국과 일본은 채용·취업 연계 시장입니다.";
  const expected = {
    ko: expectedGlobalDescription,
    en: "We directly train and source talent in Nepal, source talent through partners in Vietnam, Myanmar, Laos, and Sri Lanka, and connect candidates with employers in the destination and hiring markets of Korea and Japan.",
    ja: "ネパールでは人材を直接育成・紹介し、ベトナム・ミャンマー・ラオス・スリランカでは現地パートナーを通じて候補者を紹介します。韓国・日本は就業先・採用市場です。",
    ne: "हामी नेपालमा जनशक्तिलाई प्रत्यक्ष तालिम दिएर आपूर्ति गर्छौँ र भियतनाम, म्यानमार, लाओस तथा श्रीलंकामा साझेदारमार्फत जनशक्ति आपूर्ति गर्छौँ। कोरिया र जापान गन्तव्य तथा भर्ती बजार हुन्।",
    vi: "Chúng tôi trực tiếp đào tạo và cung ứng nhân lực tại Nepal; cung ứng qua đối tác tại Việt Nam, Myanmar, Lào và Sri Lanka; đồng thời kết nối ứng viên với doanh nghiệp tại các thị trường tiếp nhận và tuyển dụng là Hàn Quốc và Nhật Bản.",
    lo: "ພວກເຮົາຝຶກອົບຮົມ ແລະ ຈັດຫາບຸກຄະລາກອນໂດຍກົງໃນເນປານ, ຈັດຫາຜ່ານຄູ່ຮ່ວມງານໃນຫວຽດນາມ, ມຽນມາ, ລາວ ແລະ ສີລັງກາ, ແລະ ເຊື່ອມຕໍ່ຜູ້ສະໝັກກັບນາຍຈ້າງໃນຕະຫຼາດປາຍທາງ ແລະ ການຈ້າງງານຂອງເກົາຫຼີ ແລະ ຍີ່ປຸ່ນ.",
  };

  assert.equal(readGlobalSiteDescription(), expectedGlobalDescription);

  for (const [locale, countryRoleCopy] of Object.entries(expected)) {
    const catalog = readCatalog(locale, MESSAGES_DIRECTORY);
    assert.equal(catalog.site.description, countryRoleCopy);
    assert.equal(catalog.home.faq.items.countries.a, countryRoleCopy);
  }
});

test("partnership role copy limits regulated-services claims in every locale", () => {
  const expected = {
    ko: "법률 대리 업무를 제공하지 않으며, 한국·일본 기업 발굴·매칭, 입국 근로자 정착을 위한 행정 안내·조정, 자격을 갖춘 법률·노무·회계 전문가 연계를 담당합니다.",
    en: "We develop and match employers in Korea and Japan, provide administrative guidance and coordination for arriving workers, and refer them to appropriately qualified legal, labor, or accounting professionals when needed. We do not provide legal representation.",
    ja: "韓国・日本企業の開拓とマッチング、入国後の生活・就労・行政手続に関する連携支援",
    ne: "हामी कोरिया र जापानका रोजगारदाता खोजी तथा मिलान गर्छौँ, प्रवेश गरेका कामदारलाई बसोबाससम्बन्धी प्रशासनिक मार्गदर्शन र समन्वय दिन्छौँ, र आवश्यक पर्दा उचित योग्यता भएका कानुनी, श्रम तथा लेखा पेशेवरसँग सम्पर्क गराउँछौँ। हामी कानुनी प्रतिनिधित्व गर्दैनौँ।",
    vi: "Chúng tôi tìm kiếm và kết nối doanh nghiệp tại Hàn Quốc và Nhật Bản; hướng dẫn, phối hợp hành chính để hỗ trợ người lao động ổn định sau khi nhập cảnh; và khi cần, giới thiệu họ đến các chuyên gia pháp lý, lao động hoặc kế toán có đủ chuyên môn. Chúng tôi không thực hiện đại diện pháp lý.",
    lo: "ພວກເຮົາຊອກຫາ ແລະ ຈັບຄູ່ນາຍຈ້າງໃນເກົາຫຼີ ແລະ ຍີ່ປຸ່ນ, ໃຫ້ຄຳແນະນຳ ແລະ ປະສານງານດ້ານບໍລິຫານແກ່ແຮງງານທີ່ເຂົ້າປະເທດ, ແລະ ເມື່ອຈຳເປັນຈະແນະນຳພວກເຂົາໄປຫາຜູ້ຊ່ຽວຊານດ້ານກົດໝາຍ, ແຮງງານ ຫຼື ບັນຊີທີ່ມີຄຸນວຸດທິເໝາະສົມ. ພວກເຮົາບໍ່ໃຫ້ບໍລິການຕາງໜ້າທາງກົດໝາຍ.",
  };

  for (const [locale, roleCopy] of Object.entries(expected)) {
    const catalog = readCatalog(locale, MESSAGES_DIRECTORY);
    assert.equal(catalog.pages.partners.feature.mouItems.joongwooRole.description, roleCopy);
  }
});
