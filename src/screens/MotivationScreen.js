import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function MotivationScreen() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.root}>
      {loaded ? (
        <Text style={s.text}>Motivasi</Text>
      ) : (
        <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, color: '#fff', fontWeight: '600' },
});
