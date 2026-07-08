import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as locales from './locales';

const LANG_KEY = 'app_language';
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('id');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === 'en' || v === 'id') setLang(v);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const setLanguage = async (l) => {
    setLang(l);
    await AsyncStorage.setItem(LANG_KEY, l);
  };

  const t = (key) => locales[lang]?.[key] ?? locales.id?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLocale() {
  return useContext(LanguageContext);
}
