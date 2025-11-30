import 'intl-pluralrules'; // Add this polyfill

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: en,
      },
      fr: {
        translation: fr,
      },
    },
    lng: Localization.locale, // detect language from device
    fallbackLng: "en", // use English if no translation found
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
