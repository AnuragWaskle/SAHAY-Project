import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Sahay",
      "login": "Login / Sign Up",
      "dashboard": "Dashboard",
      "incidents": "Incidents",
      "demands": "Demands",
      "leaderboard": "Leaderboard",
      "city_index": "City Index",
      "language": "Language",
      "admin_portal": "Admin Portal",
      "ngo_hub": "NGO & CSR Hub",
      "officer_console": "Officer Console"
    }
  },
  hi: {
    translation: {
      "welcome": "सहाय में आपका स्वागत है",
      "login": "लॉगिन / साइन अप",
      "dashboard": "डैशबोर्ड",
      "incidents": "घटनाएं",
      "demands": "मांगें",
      "leaderboard": "लीडरबोर्ड",
      "city_index": "शहर सूचकांक",
      "language": "भाषा",
      "admin_portal": "एडमिन पोर्टल",
      "ngo_hub": "एनजीओ और सीएसआर हब",
      "officer_console": "अधिकारी कंसोल"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
