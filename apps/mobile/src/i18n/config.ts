import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "feed": "Feed",
      "report": "Report",
      "profile": "Profile",
      "sos": "SOS",
      "civic_impact": "Civic Impact",
      "recent_reports": "Recent Reports"
    }
  },
  hi: {
    translation: {
      "feed": "फ़ीड",
      "report": "रिपोर्ट",
      "profile": "प्रोफ़ाइल",
      "sos": "एसओएस (आपातकालीन)",
      "civic_impact": "नागरिक प्रभाव",
      "recent_reports": "हाल की रिपोर्ट"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
